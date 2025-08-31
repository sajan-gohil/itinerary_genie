// import fetch from 'node-fetch';
import { config } from '../config';
// import cache from '../cache';

export type RouteRequest = {
  origin: { lat: number; lon: number };
  waypoints: { lat: number; lon: number }[];
  profile: 'driving' | 'walking' | 'cycling';
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

const MAPBOX_TOKEN = config.MAPBOX_TOKEN;

function buildMapboxUrl({ origin, waypoints, profile }: RouteRequest) {
  const coords = [origin, ...waypoints].map(p => `${p.lon},${p.lat}`).join(';');
  // console.log('[buildMapboxUrl] Token:', MAPBOX_TOKEN ? '[set]' : '[empty]');
  return `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}?geometries=polyline&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`;
}

export async function getRoute(req: RouteRequest): Promise<RouteResponse> {
//   const cacheKey = `route_${JSON.stringify(req)}`;
//   const cached = await cache.get(cacheKey);
//   if (cached) return cached;

  const url = buildMapboxUrl(req);
  // console.log('[getRoute] Mapbox URL:', url);
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err: any) {
    console.error('[getRoute] Network error calling Mapbox:', err?.message);
    throw err;
  }
  console.log('[getRoute] Mapbox status:', (res as any)?.status);
  if (!res.ok) {
    let text: string | undefined;
    try { text = await res.text(); } catch {}
    console.error('[getRoute] Mapbox non-OK response:', res.status, text);
    throw new Error(`Mapbox error: ${res.status}`);
  }
  let data: { routes?: any[] };
  try {
    data = await res.json() as { routes?: any[] };
  } catch (err: any) {
    console.error('[getRoute] Failed to parse JSON:', err?.message);
    throw err;
  }
  const route = data.routes?.[0];
  if (!route) {
    console.error('[getRoute] No route in Mapbox response:', JSON.stringify(data).slice(0, 500));
    throw new Error('No route found');
  }
  const legs = route.legs.map((leg: any) => ({
    distance: leg.distance,
    duration: leg.duration,
    summary: leg.summary,
    steps: leg.steps
  }));
  const result: RouteResponse = {
    polyline: route.geometry,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    legs
  };
//   await cache.set(cacheKey, result, 3600);
  console.log('[getRoute] Success. Distance:', result.distanceMeters, 'Duration:', result.durationSeconds, 'Legs:', result.legs.length);
  return result;
}