import { Router } from 'express';
import { parseTasks } from '../llm/adapter';
import cache from '../cache';
import crypto from 'crypto';

const router = Router();

router.post('/parse-tasks', async (req, res) => {
  const { text, location } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid text' });
  }
  const hash = crypto.createHash('sha256').update(text + JSON.stringify(location || {})).digest('hex');
  let result = await cache.get(hash);
  if (!result) {
    try {
      const provider = (process.env.LLM_PROVIDER as any) || 'openai';
      result = await parseTasks(text, location, provider);
      await cache.set(hash, result, 3600); // cache for 1 hour
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
  res.json(result);
});

export default router;
