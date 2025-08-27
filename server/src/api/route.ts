import { Router } from 'express';
import { getRoute } from '../routing/mapbox';

const router = Router();

router.post('/route', async (req, res) => {
  const start = Date.now();
  // Log incoming request body (redact anything sensitive if ever added)
  try {
    console.log('[POST /api/route] Incoming body:', JSON.stringify(req.body));
  } catch {
    console.log('[POST /api/route] Incoming body: <unserializable>');
  }

  try {
    const body = req.body || {};
    const origin = body.origin;
    // Support both { waypoints } and { destinations } from client
    const inputWaypoints = Array.isArray(body.waypoints) ? body.waypoints : (Array.isArray(body.destinations) ? body.destinations : []);
    // Support both { profile } and { transportMode }
    const inputMode = (body.profile || body.transportMode || 'driving') as 'driving' | 'walking' | 'cycling';
    const profile = inputMode === 'walking' || inputMode === 'cycling' ? inputMode : 'driving';
    const waypoints = inputWaypoints;
    console.log('[POST /api/route] Derived profile:', profile, 'Waypoints count:', waypoints.length);

    // Basic validation
    if (!origin || typeof origin.lat !== 'number' || typeof origin.lon !== 'number') {
      console.error('[POST /api/route] Invalid origin:', origin);
      return res.status(400).json({ error: 'Invalid origin. Expected { lat: number, lon: number }' });
    }
    const validWaypoints = waypoints.filter((w: any) => w && typeof w.lat === 'number' && typeof w.lon === 'number');
    if (validWaypoints.length !== waypoints.length) {
      console.warn('[POST /api/route] Some waypoints were invalid and will be ignored. Count:', waypoints.length, '=>', validWaypoints.length);
    }

    // Mapbox requires at least origin + 1 destination
    if (validWaypoints.length < 1) {
      console.error('[POST /api/route] At least one waypoint (destination) is required.');
      return res.status(400).json({ error: 'At least one waypoint (destination) is required' });
    }

    const route = await getRoute({ origin, waypoints: validWaypoints, profile });
    console.log('[POST /api/route] Success:', { distanceMeters: route.distanceMeters, durationSeconds: route.durationSeconds, legs: route.legs?.length, elapsedMs: Date.now() - start });
    res.json(route);
  } catch (e: any) {
    console.error('[POST /api/route] Error:', e?.message, '\nstack:', e?.stack, '\nelapsedMs:', Date.now() - start);
    res.status(500).json({ error: e.message });
  }
});

export default router;
