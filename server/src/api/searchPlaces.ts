import { Router } from 'express';
import { searchPlaces } from '../places/foursquare';

const router = Router();

router.get('/search-places', async (req, res) => {
  const { q, lat, lon, maxResults } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Missing lat/lon. Example: ?q=coffee&lat=28.65&lon=77.23&maxResults=5' });
  }
  const ll = `${lat},${lon}`;
  try {
    const candidates = await searchPlaces({ query: q as string, ll, limit: Number(maxResults) || 5 });
    res.json({ candidates });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
