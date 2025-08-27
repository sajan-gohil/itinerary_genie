import { Router } from 'express';

const router = Router();

router.get('/geocode', async (req, res) => {
  const q = (req.query.q as string)?.trim();
  if (!q) return res.status(400).json({ error: 'Missing q' });
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '1');
    const resp = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'itinerary-genie/1.0 (https://example.com)'
      }
    });
    if (!resp.ok) return res.status(502).json({ error: 'Geocoding failed', status: resp.status });
    const data = await resp.json();
    const top = Array.isArray(data) && data[0];
    if (!top) return res.status(404).json({ error: 'No results' });
    const lat = parseFloat(top.lat);
    const lon = parseFloat(top.lon);
    const city = top.address?.city || top.address?.town || top.address?.village || top.address?.county || top.address?.state;
    return res.json({ lat, lon, city, raw: top });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
