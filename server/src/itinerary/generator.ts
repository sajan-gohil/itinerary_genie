import { scoreCandidate, CandidatePlace, Task, UserPrefs } from './scorer';
import { analyzeReviews } from '../agents/reviewAnalyzer';
import { searchPlaces } from '../places/foursquare';

export type GeneratorInput = {
  tasks: Task[];
  origin: { lat: number; lon: number };
  mode: 'order' | 'optimize';
  transportMode: 'walking' | 'driving';
  userPrefs?: UserPrefs;
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

export async function generateItinerary({ tasks, origin, mode, transportMode, userPrefs = {} }: GeneratorInput): Promise<GeneratorOutput> {
  // 1. Insert fixed-location tasks first
  const fixedTasks: OrderedStop[] = [];
  const flexibleTasks: Task[] = [];
  for (const t of tasks) {
    if ((t as any).location) {
      fixedTasks.push({ taskId: t.id, place: { ...(t as any).location, id: t.id } });
    } else {
      flexibleTasks.push(t);
    }
  }

  // 2. For each flexible task, search for candidates
  const stops: OrderedStop[] = [...fixedTasks];
  for (const [i, task] of flexibleTasks.entries()) {
    const gapLocation = stops.length > 0 ? stops[stops.length - 1].place.location ?? origin : origin;
    const ll = `${gapLocation.lat},${gapLocation.lon}`;
    const query = task.required_tags?.[0] || '';
    const placeCandidates = await searchPlaces({ query, ll, limit: 5 });
    // Map PlaceCandidate to CandidatePlace
    const candidates: CandidatePlace[] = placeCandidates.map(pc => ({
      id: pc.id,
      rating: pc.rating,
      review_count: undefined,
      tags: pc.categories,
      review_snippets: [],
      location: { lat: pc.lat, lon: pc.lon }
    }));
    // 3. Analyze reviews if present
    for (const c of candidates) {
      if (c.tags && c.tags.length === 0 && c.review_snippets) {
        const analysis = await analyzeReviews({ placeId: c.id, source: 'openai', reviews: c.review_snippets });
        c.tags = analysis.tags.map(t => t.tag);
      }
    }
    // 4. Score candidates
    const scored = candidates.map(c => ({ c, score: scoreCandidate({ candidatePlace: c, task, userPrefs, currentLocation: gapLocation }) }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored[0]?.c;
    if (top) stops.push({ taskId: task.id, place: top });
  }

  // 5. Optimize order if requested
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

  // 6. Output
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
