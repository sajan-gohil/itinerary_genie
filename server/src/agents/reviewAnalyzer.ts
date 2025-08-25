import { getLLMCompletion } from '../llm/adapter';

export type ReviewAnalysisTag = {
  tag: string;
  score: number;
};

export type AnalyzeReviewsInput = {
  placeId: string;
  source: string;
  reviews: string[];
};

export type AnalyzeReviewsOutput = {
  placeId: string;
  tags: ReviewAnalysisTag[];
  confidence: number;
};

const TAGS = [
  'chill',
  'quick_bite',
  'family_friendly',
  'romantic',
  'noisy',
  'fast_service',
  'reservation_recommended',
  'budget_friendly',
  'fine_dining',
  'outdoor_seating',
];

function buildPrompt(placeId: string, reviews: string[]): string {
  return `System: You are a review classifier. Read the list of short review snippets and output strict JSON:\n\n{\n  "placeId": "${placeId}",\n  "tags": [\n    { "tag": "chill", "score": 0.0-1.0 },\n    ...\n  ],\n  "confidence": 0.0-1.0\n}\n\nOnly include tags from this allowed list:\n["chill", "quick_bite", "family_friendly", "romantic", "noisy", "fast_service", "reservation_recommended", "budget_friendly", "fine_dining", "outdoor_seating"]\n\nUser: Here are reviews: ${JSON.stringify(reviews)}`;
}

export async function analyzeReviews({ placeId, source, reviews }: AnalyzeReviewsInput): Promise<AnalyzeReviewsOutput> {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return { placeId, tags: [], confidence: 0.2 };
  }
  const prompt = buildPrompt(placeId, reviews);
  let tags: ReviewAnalysisTag[] = [];
  let confidence = 0.8;
  try {
  const response = await getLLMCompletion({ prompt, provider: source as any });
    tags = JSON.parse(response);
    // Validate tags
    tags = Array.isArray(tags)
      ? tags.filter(
          (t) =>
            typeof t.tag === 'string' &&
            TAGS.includes(t.tag) &&
            typeof t.score === 'number' &&
            t.score >= 0 &&
            t.score <= 1
        )
      : [];
    confidence = tags.length > 0 ? 0.9 : 0.5;
  } catch (e) {
    tags = [];
    confidence = 0.3;
  }
  return { placeId, tags, confidence };
}
