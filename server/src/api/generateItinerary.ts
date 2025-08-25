import { generateItinerary } from '../itinerary/generator';
import { Request, Response } from 'express';
import crypto from 'crypto';

export async function postGenerateItinerary(req: Request, res: Response) {
  const { tasks, origin, mode, transportMode, userPrefs } = req.body || {};
  if (!Array.isArray(tasks) || !origin || typeof origin.lat !== 'number' || typeof origin.lon !== 'number' || !mode || !transportMode) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  try {
    const result = await generateItinerary({ tasks, origin, mode, transportMode, userPrefs });
    const itineraryId = crypto.randomUUID();
    res.json({ itineraryId, ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
