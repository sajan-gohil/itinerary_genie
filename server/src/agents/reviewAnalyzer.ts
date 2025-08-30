import { getLLMCompletion } from '../llm/adapter';


export type ReviewAspectScore = {
  aspect: string;
  score: number;
};

export type AnalyzeReviewsInput = {
  placeId: string;
  source: string;
  reviews: string[];
  userQuery?: string;
};

export type AnalyzeReviewsOutput = {
  placeId: string;
  aspectScores: ReviewAspectScore[];
  rating: number;
  confidence: number;
};



function buildPrompt(placeId: string, reviews: string[], userQuery?: string): string {
  const aspects = [
    "might fulfill user need",
    "positiveness of reviews",
    "convenience",
    "cleanliness",
    "service quality"
  ];
  return `System: You are a review analyzer. Read the concatenated review text and output strict JSON:\n\n{\n  "placeId": "${placeId}",\n  "aspectScores": [\n    { "aspect": "might fulfill user need", "score": 1-5 },\n    { "aspect": "positiveness of reviews", "score": 1-5 },\n    { "aspect": "convenience", "score": 1-5 },\n    { "aspect": "cleanliness", "score": 1-5 },\n    { "aspect": "service quality", "score": 1-5 }\n  ],\n  "confidence": 0.0-1.0\n}\n\nUser query: ${userQuery || ''}\nUser: Here are the reviews (concatenated):\n${reviews.join(' ')}\n\nScore each aspect from 1 (bad) to 5 (excellent), decimals allowed. Average the scores for overall rating.`;
}


export async function analyzeReviews({ placeId, source, reviews, userQuery }: AnalyzeReviewsInput): Promise<AnalyzeReviewsOutput> {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return { placeId, aspectScores: [], rating: 0, confidence: 0.2 };
  }
  const prompt = buildPrompt(placeId, reviews, userQuery);
  let aspectScores: ReviewAspectScore[] = [];
  let confidence = 0.8;
  let rating = 0;
  try {
    let response = await getLLMCompletion({ prompt, provider: source as any });
    // Remove markdown code block markers if present
    response = response.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(response);
    aspectScores = Array.isArray(parsed.aspectScores)
      ? parsed.aspectScores.filter(
          (a: any) => typeof a.aspect === 'string' && typeof a.score === 'number' && a.score >= 1 && a.score <= 5
        )
      : [];
    if (aspectScores.length > 0) {
      rating = aspectScores.reduce((sum, a) => sum + a.score, 0) / aspectScores.length;
      confidence = parsed.confidence ?? 0.9;
    } else {
      confidence = 0.5;
    }
  } catch (e) {
    aspectScores = [];
    rating = 0;
    confidence = 0.3;
    console.warn(`[analyzeReviews] Failed to analyze reviews for ${placeId}:`, (e as any)?.message || e);
  }
  return { placeId, aspectScores, rating, confidence };
}
