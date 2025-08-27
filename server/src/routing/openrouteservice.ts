// import fetch from 'node-fetch';
import { config } from '../config';
import cache from '../cache';

export type RouteRequest = {
  origin: { lat: number; lon: number };
  waypoints: { lat: number; lon: number }[];
  profile: 'driving-car' | 'foot-walking' | 'cycling-regular';
};

export type RouteResponse = {
  polyline: string;
  distanceMeters: number;
  durationSeconds: number;
  legs: Array<{
    distance: number;
    duration: number;
    summary: string;
    steps?: any[];
  }>;
};

const ORS_TOKEN = process.env.ORS_TOKEN || config.ORS_TOKEN;
// if (!ORS_TOKEN) {
//   throw new Error('Missing ORS_TOKEN environment variable');
// }
// // ORS_TOKEN is guaranteed to be a string below
// const ORS_TOKEN_STR = ORS_TOKEN as string;

function buildORSUrl({ origin, waypoints, profile }: RouteRequest) {
  const coords = [origin, ...waypoints].map(p => [p.lon, p.lat]);
  return `https://api.openrouteservice.org/v2/directions/${profile}`;
}

export async function getRouteORS(req: RouteRequest): Promise<RouteResponse> {
  const cacheKey = `route_ors_${JSON.stringify(req)}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const url = buildORSUrl(req);
  const body = {
    coordinates: [req.origin, ...req.waypoints].map(p => [p.lon, p.lat]),
    instructions: true,
    geometry: true
  };
  const res = await fetch(url, {
    headers: {
      'Authorization': ORS_TOKEN,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`ORS error: ${res.status}`);
  const data = await res.json() as {
    routes?: Array<{
      geometry: string;
      summary: { distance: number; duration: number };
      segments: Array<{
        distance: number;
        duration: number;
        steps?: Array<{ instruction: string }>;
      }>;
    }>;
  };
  const route = data.routes?.[0];
  if (!route) throw new Error('No route found');
  const legs = route.segments.map((seg: any) => ({
    distance: seg.distance,
    duration: seg.duration,
    summary: seg.steps?.map((s: any) => s.instruction).join(', '),
    steps: seg.steps
  }));
  const result: RouteResponse = {
    polyline: route.geometry,
    distanceMeters: route.summary.distance,
    durationSeconds: route.summary.duration,
    legs
  };
  await cache.set(cacheKey, result, 3600);
  return result;
}
