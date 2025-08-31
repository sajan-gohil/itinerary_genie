import { config } from '../config';

export async function fetchGoogleReviews(placeId: string): Promise<string[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || config.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('Missing GOOGLE_MAPS_API_KEY');
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Maps API error: ${res.status}`);
  const data = await res.json();
  // console.log("GOOGLE MAPS RESULT =============== ", data)
  const reviews = (data.result?.reviews || []).map((r: any) => r.text).filter(Boolean);
  return reviews;
}
