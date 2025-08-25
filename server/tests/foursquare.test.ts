import { searchPlaces, getPlaceDetails } from '../src/places/foursquare';
// Add Jest types for TypeScript
import type {} from '@jest/globals';
import { jest } from '@jest/globals';

jest.mock('../src/cache', () => ({
  __esModule: true,
  default: {
    get: async () => null,
    set: async () => {},
    has: async () => false,
  },
}));

global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  if (url.includes('/search')) {
    return {
      ok: true,
      json: async () => ({
        results: [
          {
            fsq_id: '1',
            name: 'Coffee Bar',
            geocodes: { main: { latitude: 28.65, longitude: 77.23 } },
            distance: 100,
            rating: 4.5,
            categories: [{ name: 'Coffee' }]
          }
        ]
      })
    } as any;
  }
  if (url.includes('/places/1')) {
    return {
      ok: true,
      json: async () => ({
        fsq_id: '1',
        name: 'Coffee Bar',
        location: { formatted_address: '123 Main St' },
        tel: '1234567890',
        website: 'http://coffeebar.com',
        hours: '8am-8pm',
        categories: [{ name: 'Coffee' }],
        tips: ['Great coffee!'],
        rating: 4.5
      })
    } as any;
  }
  return { ok: false, status: 404 } as any;
});

describe('Foursquare Adapter', () => {
  it('searchPlaces returns candidates', async () => {
    const results = await searchPlaces({ query: 'coffee', ll: '28.65,77.23', limit: 1 });
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Coffee Bar');
  });

  it('getPlaceDetails returns details', async () => {
    const details = await getPlaceDetails('1');
    expect(details.name).toBe('Coffee Bar');
    expect(details.address).toBe('123 Main St');
    expect(details.phone).toBe('1234567890');
    expect(details.website).toBe('http://coffeebar.com');
    expect(details.rating).toBe(4.5);
  });
});

function expect(received: any) {
    return {
        toBe(expected: any) {
            if (received !== expected) {
                throw new Error(`Expected ${received} to be ${expected}`);
            }
        },
        toEqual(expected: any) {
            const isEqual = JSON.stringify(received) === JSON.stringify(expected);
            if (!isEqual) {
                throw new Error(`Expected ${JSON.stringify(received)} to equal ${JSON.stringify(expected)}`);
            }
        },
        toBeDefined() {
            if (received === undefined) {
                throw new Error(`Expected value to be defined, but received undefined`);
            }
        },
        toHaveProperty(prop: string) {
            if (!(prop in received)) {
                throw new Error(`Expected object to have property '${prop}', but it does not.`);
            }
        },
        toBeGreaterThanOrEqual(expected: number) {
            if (typeof received !== 'number' || received < expected) {
                throw new Error(`Expected ${received} to be greater than or equal to ${expected}`);
            }
        }
    };
}