import { analyzeReviews } from '../src/agents/reviewAnalyzer';
import { jest, expect } from '@jest/globals';

jest.mock('../src/llm/adapter', () => ({
  getLLMCompletion: jest.fn(async ({ prompt }) => {
    if (prompt.includes('pizza')) {
      return JSON.stringify([
        { tag: 'quick_bite', score: 0.9 },
        { tag: 'family_friendly', score: 0.7 },
      ]);
    }
    return JSON.stringify([]);
  }),
}));

describe('analyzeReviews', () => {
  it('returns tags and high confidence for pizza reviews', async () => {
    const result = await analyzeReviews({
      placeId: '123',
      source: 'test',
      reviews: ['Great pizza!', 'Kids loved it.']
    });
    expect(result.placeId).toBe('123');
    expect(result.tags).toEqual([
      { tag: 'quick_bite', score: 0.9 },
      { tag: 'family_friendly', score: 0.7 },
    ]);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('returns empty tags and low confidence for empty reviews', async () => {
    const result = await analyzeReviews({ placeId: 'empty', source: 'test', reviews: [] });
    expect(result.tags).toEqual([]);
    expect(result.confidence).toBe(0.2);
  });

  it('filters out invalid tags and scores', async () => {
    jest.mocked(require('../src/llm/adapter').getLLMCompletion).mockResolvedValueOnce(
      JSON.stringify([
        { tag: 'invalid_tag', score: 0.5 },
        { tag: 'chill', score: 1.1 },
        { tag: 'chill', score: 0.7 },
      ])
    );
    const result = await analyzeReviews({ placeId: 'filter', source: 'test', reviews: ['Nice vibe'] });
    expect(result.tags).toEqual([{ tag: 'chill', score: 0.7 }]);
  });
});
