import { generateItinerary } from '../itinerary/generator';
import { sendProgress } from '../progress';
import { Request, Response } from 'express';
import crypto from 'crypto';

export async function postGenerateItinerary(req: Request, res: Response) {
  const { tasks, origin, mode, transportMode, userPrefs, jobId } = req.body || {};
  // console.log("[postGenerateItinerary] Received generate-itinerary request with body:", req.body);
  if (!Array.isArray(tasks) || !origin || typeof origin.lat !== 'number' || typeof origin.lon !== 'number' || !mode || !transportMode) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  try {
  // Send some coarse progress updates tied to jobId if provided
  if (jobId) sendProgress(jobId, 'Parsing tasks');
  const result = await generateItinerary({ tasks, origin, mode, transportMode, userPrefs, jobId });
    const itineraryId = crypto.randomUUID();
    res.json({ itineraryId, ...result });
  } catch (e: any) {
    console.error(`Error generating itinerary: ${e.message}`);
    // detailed traceback
    console.error(e.stack);
    res.status(500).json({ error: e.message });
  }
}
