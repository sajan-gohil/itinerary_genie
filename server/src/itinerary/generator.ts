import { scoreCandidate, CandidatePlace, Task, UserPrefs } from './scorer';
import { analyzeReviews } from '../agents/reviewAnalyzer';
import { checkCandidateRelevance } from '../agents/relevanceChecker';
import { config } from '../config';
import { fetchGoogleReviews } from '../places/google';
import { fetchGooglePlaceId } from '../places/googlePlaceId';
import { searchPlaces } from '../places/foursquare';

export type GeneratorInput = {
  tasks: Task[];
  origin: { lat: number; lon: number };
  mode: 'order' | 'optimize';
  transportMode: 'walking' | 'driving';
  userPrefs?: UserPrefs;
  jobId?: string;
};

export type OrderedStop = {
  taskId: string;
  place: CandidatePlace;
};

export type GeneratorOutput = {
  orderedStops: OrderedStop[];
  summaryScores: number[];
  routeRequest: {
    origin: { lat: number; lon: number };
    destinations: { lat: number; lon: number }[];
    transportMode: 'walking' | 'driving';
  };
};

function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x = dLat / 2, y = dLon / 2;
  const aa = Math.sin(x) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(y) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

// After retrieving candidate places, sort them by distance from the provided origin (nearest first)
function calculateDistance(loc1: { lat: number; lng: number }, loc2: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (loc2.lat - loc1.lat) * rad;
  const dLng = (loc2.lng - loc1.lng) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(loc1.lat * rad) * Math.cos(loc2.lat * rad) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c; // distance in kilometers
}

import { sendProgress } from '../progress';

export async function generateItinerary({ tasks, origin, mode, transportMode, userPrefs = {}, jobId }: GeneratorInput): Promise<GeneratorOutput> {
  console.log("Origin at start of generateItinerary = ", origin);
  console.log("Tasks = ", tasks);
  console.log("Mode = ", mode);
  console.log("Transport Mode = ", transportMode);
  if (jobId) sendProgress(jobId, 'Searching locations');
  // 1. Insert fixed-location tasks first
  const fixedTasks: OrderedStop[] = [];
  const flexibleTasks: Task[] = [];
  for (const t of tasks) {
    if ((t as any).location) {
      fixedTasks.push({
        taskId: t.id,
        place: {
          id: t.id,
          location: { lat: (t as any).location.lat, lon: (t as any).location.lon },
          name: (t as any).name ?? `Fixed task ${t.id}`,
          rating: undefined,
          review_count: undefined,
          tags: [],
          review_snippets: []
        }
      });
    } else {
      flexibleTasks.push(t);
    }
  }

  // 2. For each flexible task, search for candidates
  const stops: OrderedStop[] = [...fixedTasks];
  for (const [i, task] of flexibleTasks.entries()) {
    if (jobId) sendProgress(jobId, `Searching locations for task ${i + 1}/${flexibleTasks.length}`);
    // console.log("===============================================")
    // console.log(`[generateItinerary] Processing flexible task ${i + 1}/${flexibleTasks.length}:`, task);
    const gapLocation = stops.length > 0 ? stops[stops.length - 1].place.location ?? origin : origin;
    const ll = `${gapLocation.lat},${gapLocation.lon}`;
    // Build a meaningful query: prefer category_hint, then required_tags, then raw text
    const query = (
      ((task as any).category_hint as string | undefined)?.replace(/_/g, ' ') ||
      (task.required_tags && task.required_tags.length ? task.required_tags.join(' ') : undefined) ||
      ((task as any).raw as string | undefined) ||
      ''
    );
    // console.log(`[generateItinerary] Searching places near ${ll} with query: "${query}" (from category_hint/raw/tags)`);
    const placeCandidates = await searchPlaces({ query, ll, limit: 3 });
    // Map PlaceCandidate to CandidatePlace, add raw and city from task
    let candidates: CandidatePlace[] = placeCandidates.map(pc => {
      // Concatenate address fields except formatted_address
      const addressParts = [
        (pc as any).address,
        (pc as any).locality,
        (pc as any).region,
        (pc as any).postcode,
        (pc as any).admin_region,
        (pc as any).post_town,
        (pc as any).po_box,
        (pc as any).country
      ].filter(Boolean);
      const address = addressParts.join(', ');
      const formatted_address = (pc as any).formatted_address || '';
      return {
        id: pc.id,
        rating: pc.rating,
        review_count: undefined,
        tags: pc.categories,
        review_snippets: [],
        location: { lat: pc.lat, lon: pc.lon },
        name: pc.name,
        raw: (task as any).raw,
        city: (task as any).city || formatted_address || (pc as any).region || '',
        country: (pc as any).country || '',
        address,
        formatted_address
      };
    });
    // If no candidates, insert placeholder
    if (candidates.length === 0) {
      candidates = [{
        id: 'no_candidate',
        rating: undefined,
        review_count: undefined,
        tags: [],
        review_snippets: [],
        location: gapLocation,
        name: 'No candidate — requires user input'
      }];
    }
    // 3. Filter irrelevant candidates using relevance checker (LLM with heuristic fallback)
  const provider = (process.env.LLM_PROVIDER as any) || (config.LLM_PROVIDER as any) || 'openai';
  if (jobId) sendProgress(jobId, `Filtering locations for task ${i + 1}/${flexibleTasks.length}`);
    const withRelevance = [] as CandidatePlace[];
    for (const c of candidates) {
      try {
        const rel = await checkCandidateRelevance(task, c, provider);
        // console.log(`[generateItinerary] Relevance for ${c.name} (${c.id}):`, rel);
        if (rel?.relevant) withRelevance.push(c);
      } catch (e) {
        // On unexpected error, keep the candidate to avoid over-filtering
        console.warn(`[generateItinerary] Relevance check failed for ${c.id}:`, (e as any)?.message || e);
        withRelevance.push(c);
      }
    }
    candidates = withRelevance;
    if (candidates.length === 0) {
      // If all filtered, add a placeholder so pipeline continues
      candidates = [{
        id: 'no_relevant_candidate',
        rating: undefined,
        review_count: undefined,
        tags: [],
        review_snippets: [],
        location: gapLocation,
        name: 'No relevant candidate — requires user input'
      }];
    }

    // Sort candidates by distance from the gap location (nearest first)
    candidates.sort((a, b) =>
      calculateDistance(
        { lat: gapLocation.lat, lng: gapLocation.lon },
        { lat: a.location.lat, lng: a.location.lon }
      ) -
      calculateDistance(
        { lat: gapLocation.lat, lng: gapLocation.lon },
        { lat: b.location.lat, lng: b.location.lon }
      )
    );

  // 4. Fetch reviews from Google Maps and analyze
  if (jobId) sendProgress(jobId, `Checking reviews for task ${i + 1}/${flexibleTasks.length}`);
    for (const c of candidates) {
      // console.log(`[generateItinerary] Analyzing reviews for candidate:`, c);
      let reviews: string[] = [];
      // Try to fetch Google reviews using name and address
      try {
        let placeId: string | null = null;
        // console.log("C = = ", c)
        if (c.name && (c as any).address) {
          placeId = await fetchGooglePlaceId(c.name, (c as any).address);
        }
        if (placeId) {
          reviews = await fetchGoogleReviews(placeId);
        }
      } catch (err: any) {
        console.warn(`[generateItinerary] Could not fetch Google reviews for ${c.name}:`, err && typeof err === 'object' && 'message' in err ? (err as any).message : String(err));
      }
      // Fallback to existing review_snippets if Google reviews not available
      if ((!reviews || reviews.length === 0) && c.review_snippets && c.review_snippets.length > 0) {
        reviews = c.review_snippets;
      }
      if (reviews && reviews.length > 0) {
        const userQuery = (task as any).raw || '';
        const analysis = await analyzeReviews({ placeId: c.id, source: 'openai', reviews, userQuery });
        c.rating = analysis.rating;
        // Optionally, you can store aspect scores or confidence if needed
        // console.log(`[generateItinerary] Review analysis for ${c.name} (${c.id}):`, analysis);
      }
    }
  // 5. Score candidates
  if (jobId) sendProgress(jobId, `Scoring candidates for task ${i + 1}/${flexibleTasks.length}`);
    const scored = candidates.map(c => ({ c, score: scoreCandidate({ candidatePlace: c, task, userPrefs, currentLocation: gapLocation }) }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored[0]?.c;
    if (top) stops.push({ taskId: task.id, place: top });
  }

  // 6. Optimize order if requested
  if (jobId) sendProgress(jobId, 'Optimizing route');
  let orderedStops = stops;
  if (mode === 'optimize' && orderedStops.length > 2) {
    // Greedy nearest neighbor TSP, respecting fixed tasks at their positions
    const fixedIdx = fixedTasks.map((_, i) => i);
    const flexIdx = orderedStops.map((_, i) => i).filter(i => !fixedIdx.includes(i));
    let route = [0];
    let remaining = flexIdx.slice(1);
    while (remaining.length) {
      const last = orderedStops[route[route.length - 1]].place.location;
      let bestIdx = -1, bestDist = Infinity;
      for (const idx of remaining) {
        const dist = haversine(last, orderedStops[idx].place.location);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      }
      route.push(bestIdx);
      remaining = remaining.filter(i => i !== bestIdx);
    }
    orderedStops = route.map(i => orderedStops[i]);
  }

  // 7. Output
  if (jobId) sendProgress(jobId, 'Done');
  return {
    orderedStops,
    summaryScores: orderedStops.map(s => scoreCandidate({ candidatePlace: s.place, task: tasks.find(t => t.id === s.taskId)!, userPrefs, currentLocation: origin })),
    routeRequest: {
      origin,
      destinations: orderedStops.map(s => s.place.location),
      transportMode,
    },
  };
}
