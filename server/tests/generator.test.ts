import { generateItinerary } from '../src/itinerary/generator';
import { jest, expect } from '@jest/globals';

jest.mock('../src/itinerary/scorer', () => {
  const actualScorer = jest.requireActual('../src/itinerary/scorer');
  return Object.assign({}, actualScorer, {
    scoreCandidate: jest.fn(() => 0.9)
  });
});

jest.mock('../src/places/foursquare', () => ({
  searchPlaces: jest.fn(async ({ query, ll, limit }) => [
    { id: 'p1', name: 'Place 1', lat: 1, lon: 2, distanceMeters: 100, rating: 4.5, categories: ['chill'], fsq_id: 'p1' },
    { id: 'p2', name: 'Place 2', lat: 1.1, lon: 2.1, distanceMeters: 200, rating: 4.0, categories: ['quick_bite'], fsq_id: 'p2' }
  ])
}));

describe('generateItinerary', () => {
  it('selects one candidate per flexible task and returns ordered stops', async () => {
    const tasks = [
      { id: 't1', required_tags: ['chill'] },
      { id: 't2', required_tags: ['quick_bite'] }
    ];
    const origin = { lat: 1, lon: 2 };
    const result = await generateItinerary({ tasks, origin, mode: 'order', transportMode: 'walking' });
    expect(result.orderedStops.length).toBe(2);
    expect(result.orderedStops[0].place.id).toBe('p1');
    expect(result.orderedStops[1].place.id).toBe('p1'); // always picks top mock
    expect(result.routeRequest.origin).toEqual(origin);
    expect(result.routeRequest.destinations.length).toBe(2);
  });
});
