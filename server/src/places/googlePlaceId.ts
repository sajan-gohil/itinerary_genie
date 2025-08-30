import { config } from '../config';

export async function fetchGooglePlaceId(name: string, address: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || config.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('Missing GOOGLE_MAPS_API_KEY');
  const input = encodeURIComponent(`${name}, ${address}`);
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${input}&inputtype=textquery&fields=place_id&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Maps API error: ${res.status}`);
  const data = await res.json();
  console.log("GOOGLE MAPS PLACEID RESULT =============== ", data);
  const placeId = data.candidates?.[0]?.place_id || null;
  return placeId;
}
