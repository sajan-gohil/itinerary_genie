// Scoring function for candidate places for itinerary tasks
// Each subscore is normalized to 0..1:
// - normalized_rating: (rating - min) / (max - min), typically min=3, max=5
// - normalized_review_count: log(review_count) / log(max_review_count), capped at 1
// - tag_match_score: fraction of required tags present in candidate tags
// - distance_score: 1 - min(distance_km, cap)/cap, cap=10km (closer is better)

export type CandidatePlace = {
  id: string;
  rating?: number;
  review_count?: number;
  tags?: string[];
  review_snippets?: string[];
  location: { lat: number; lon: number };
};

export type Task = {
  id: string;
  required_tags?: string[];
};

export type UserPrefs = {
  preferred_tags?: string[];
};

export function scoreCandidate({ candidatePlace, task, userPrefs, currentLocation }:{
  candidatePlace: CandidatePlace;
  task: Task;
  userPrefs: UserPrefs;
  currentLocation: { lat: number; lon: number };
}): number {
  // Rating normalization
  const minRating = 3, maxRating = 5;
  const rating = candidatePlace.rating ?? minRating;
  const normalized_rating = Math.max(0, Math.min(1, (rating - minRating) / (maxRating - minRating)));

  // Review count normalization
  const maxReviewCount = 500;
  const review_count = candidatePlace.review_count ?? 0;
  const normalized_review_count = Math.max(0, Math.min(1, Math.log10(review_count + 1) / Math.log10(maxReviewCount)));

  // Tag match score
  const candidateTags = candidatePlace.tags ?? [];
  const requiredTags = task.required_tags ?? [];
  const preferredTags = userPrefs.preferred_tags ?? [];
  const allTags = [...requiredTags, ...preferredTags];
  const tagMatches = allTags.length > 0 ? candidateTags.filter(t => allTags.includes(t)).length / allTags.length : 0.5;
  const tag_match_score = Math.max(0, Math.min(1, tagMatches));

  // Distance score
  const capKm = 10;
  const toRad = (deg: number) => deg * Math.PI / 180;
  const R = 6371; // Earth radius km
  const dLat = toRad(candidatePlace.location.lat - currentLocation.lat);
  const dLon = toRad(candidatePlace.location.lon - currentLocation.lon);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(currentLocation.lat)) * Math.cos(toRad(candidatePlace.location.lat)) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distanceKm = R * c;
  const distance_score = Math.max(0, 1 - Math.min(distanceKm, capKm)/capKm);

  // Example weights
  const w1 = 0.35, w2 = 0.15, w3 = 0.4, w4 = 0.1;
  return w1*normalized_rating + w2*normalized_review_count + w3*tag_match_score + w4*distance_score;
}
