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
  "chill",
  "quick_bite",
  "family_friendly",
  "romantic",
  "noisy",
  "entertaining",
  "fast_service",
  "reservation_recommended",
  "budget_friendly",
  "fine_dining",
  "outdoor_seating",
  "pure_veg",
  "non_veg_friendly",
  "street_food",
  "local_cuisine",
  "regional_specialty",
  "late_night_open",
  "early_morning_open",
  "brunch_spot",
  "delivery_available",
  "takeaway_friendly",
  "alcohol_served",
  "craft_beer",
  "rooftop",
  "pet_friendly",
  "kids_play_area",
  "wheelchair_accessible",
  "parking_available",
  "valet_parking",
  "live_music",
  "standup_comedy",
  "cozy_interior",
  "luxury",
  "eco_friendly",
  "organic_options",
  "health_conscious",
  "gluten_free_options",
  "vegan_options",
  "halal_certified",
  "wifi_available",
  "work_friendly",
  "power_outlets",
  "good_for_groups",
  "date_night",
  "solo_friendly",
  "photogenic",
  "historic_place",
  "religious_site",
  "safety_at_night",
  "crowded_on_weekends",
  "quiet_workspace"
]


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
