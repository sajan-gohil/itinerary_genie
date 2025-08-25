
import { analyzeReviews } from '../agents/reviewAnalyzer';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { Request, Response } from 'express';

const CACHE_PATH = path.resolve(__dirname, '../../cache.json');

function readCache(): Record<string, any> {
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, any>) {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

export async function postAnalyzeReviews(req: Request, res: Response) {
  const { placeId, source, reviews } = req.body || {};
  if (typeof placeId !== 'string' || typeof source !== 'string' || !Array.isArray(reviews)) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  const cache = readCache();
  if (cache[placeId]) {
    return res.json(cache[placeId]);
  }
  const analysis = await analyzeReviews({ placeId, source, reviews });
  cache[placeId] = analysis;
  writeCache(cache);
  return res.json(analysis);
}
