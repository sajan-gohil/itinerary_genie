import { config } from '../config';
import cache from '../cache';

export interface PlaceCandidate {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceMeters: number;
  rating?: number;
  categories: string[];
  fsq_id: string;
}

export async function searchPlaces({ category, ll, query, limit = 5, radius, sort }:{ category?: string; ll: string; query?: string; limit?: number; radius?: number; sort?: string; }): Promise<PlaceCandidate[]> {
  const cacheKey = `fsq_search_${category || ''}_${ll}_${query || ''}_${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

    const params = new URLSearchParams();
    if (ll) params.append('ll', ll);
    if (query || category) params.append('query', query || category || '');
    if (limit) params.append('limit', String(limit));
    if (radius) params.append('radius', String(radius));
    if (sort) params.append('sort', sort);

    const url = `https://places-api.foursquare.com/places/search?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer 5ITHH2NKVODGE2C3NZWBU2JFKRHTSAOTH0B050CIKNTBASWE`,
      'accept': 'application/json',
      'X-Places-Api-Version': '2025-06-17'
    }
  });
  if (!res.ok) throw new Error(`Foursquare API error: ${res.status}`);
  const data = await res.json();
  const candidates: PlaceCandidate[] = (data.results || []).map((place: any) => {
    const lat = place.geocodes?.main?.latitude ?? null;
    const lon = place.geocodes?.main?.longitude ?? null;
    return {
      id: place.fsq_id,
      name: place.name,
      lat,
      lon,
      distanceMeters: place.distance,
      rating: place.rating,
      categories: (place.categories || []).map((c: any) => c.name),
      fsq_id: place.fsq_id
    };
  });
  await cache.set(cacheKey, candidates, 600); // cache for 10 min
  return candidates;
}

export async function getPlaceDetails(fsq_id: string): Promise<any> {
  const cacheKey = `fsq_details_${fsq_id}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const url = `https://api.foursquare.com/v3/places/${fsq_id}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': config.FOURSQUARE_API_KEY,
      'accept': 'application/json'
    }
  });
  if (!res.ok) throw new Error(`Foursquare API error: ${res.status}`);
  const data = await res.json();
  const details = {
    id: data.fsq_id,
    name: data.name,
    address: data.location?.formatted_address,
    phone: data.tel,
    website: data.website,
    hours: data.hours,
    categories: (data.categories || []).map((c: any) => c.name),
    tips: data.tips || [],
    rating: data.rating
  };
  await cache.set(cacheKey, details, 3600); // cache for 1 hour
  return details;
}
