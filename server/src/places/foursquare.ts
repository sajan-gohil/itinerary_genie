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

export async function searchPlaces({
  category,
  ll,
  query,
  limit = 5,
  radius,
  sort,
}: {
  category?: string;
  ll: string;
  query?: string;
  limit?: number;
  radius?: number;
  sort?: string;
}): Promise<PlaceCandidate[]> {
  // Build query params
  console.log("[searchPlaces] Building query params...", category, ll, query, limit, radius, sort);
  const params = new URLSearchParams();
  if (ll) params.append("ll", ll);
  if (query || category) params.append("query", query || category || "");
  if (limit) params.append("limit", String(limit));
  if (radius) params.append("radius", String(radius));
  if (sort) params.append("sort", sort);

  const url = `https://places-api.foursquare.com/places/search?${params.toString()}`;
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      "X-Places-Api-Version": config.FOURSQUARE_API_VERSION,
      Authorization: `Bearer ${config.FOURSQUARE_API_KEY}`,
    },
  };

  console.log("[searchPlaces] URL:", url);
  const res = await fetch(url, options);
  console.log("[searchPlaces] Response status:", res.status);
  if (!res.ok) throw new Error(`Foursquare API error: ${res.status}`);
  const data = await res.json();
  // console.log('[searchPlaces] Raw data:', JSON.stringify(data, null, 2));
  const candidates: PlaceCandidate[] = (data.results || []).map(
    (place: any) => {
      const mapped = {
        id: place.fsq_place_id || place.fsq_id,
        name: place.name,
        lat: place.geocodes?.main?.latitude ?? place.latitude,
        lon: place.geocodes?.main?.longitude ?? place.longitude,
        distanceMeters: place.distance,
        categories: (place.categories || []).map((c: any) => c.name),
        address: place.location?.address,
        formatted_address: place.location?.formatted_address,
        locality: place.location?.locality,
        region: place.location?.region,
        country: place.location?.country,
        tel: place.tel,
        website: place.website,
        fsq_id: place.fsq_place_id || place.fsq_id,
      };
      // console.log('[searchPlaces] Candidate:', mapped);
      return mapped;
    }
  );
  // console.log('[searchPlaces] Candidates count:', candidates.length);
  return candidates;
}

export async function getPlaceDetails(fsq_id: string): Promise<any> {
  const url = `https://places-api.foursquare.com/places/${fsq_id}`;
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'X-Places-Api-Version': config.FOURSQUARE_API_VERSION,
      Authorization: 'Bearer ' + config.FOURSQUARE_API_KEY
    }
  };

  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`Foursquare API error: ${res.status}`);
  const data = await res.json();
  // Log raw details for debugging
  console.log('[getPlaceDetails] data len:', JSON.stringify(data, null, 2));
  // Map relevant fields
  return {
    id: data.fsq_place_id || data.fsq_id,
    name: data.name,
    lat: data.geocodes?.main?.latitude ?? data.latitude,
    lon: data.geocodes?.main?.longitude ?? data.longitude,
    categories: (data.categories || []).map((c: any) => c.name),
    // Prefer formatted_address if present (tests expect this)
    address: data.location?.address || data.location?.formatted_address,
    formatted_address: data.location?.formatted_address,
    locality: data.location?.locality,
    region: data.location?.region,
    country: data.location?.country,
    // Provide both phone and tel for convenience
    phone: data.tel || data.phone,
    tel: data.tel || data.phone,
    website: data.website,
    hours: data.hours,
    rating: data.rating,
    tips: data.tips || [],
    social_media: data.social_media || {},
    chains: data.chains || [],
    link: data.link,
    placemaker_url: data.placemaker_url
  };
}
