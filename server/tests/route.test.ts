import { getRoute } from '../src/routing/mapbox';
import { jest, expect } from '@jest/globals';

jest.mock('../src/cache', () => ({
  get: jest.fn(() => null),
  set: jest.fn(),
  has: jest.fn(() => false)
}));

describe('getRoute', () => {
  it('returns mocked route response', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        routes: [{
          geometry: 'mock_polyline',
          distance: 1234,
          duration: 567,
          legs: [
            { distance: 1234, duration: 567, summary: 'Leg 1', steps: [] }
          ]
        }]
      })
    })) as any;
    const req = {
      origin: { lat: 1, lon: 2 },
      waypoints: [{ lat: 3, lon: 4 }],
      profile: 'driving' as const
    };
    const res = await getRoute(req);
    expect(res.polyline).toBe('mock_polyline');
    expect(res.distanceMeters).toBe(1234);
    expect(res.durationSeconds).toBe(567);
    expect(res.legs.length).toBe(1);
  });
});
