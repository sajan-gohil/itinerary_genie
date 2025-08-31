import { Router } from 'express';

const EXAMPLES = [
  'Visit a museum, get coffee, dinner with friends',
  'See a movie, quick lunch, walk in the park',
  'Shopping mall, coffee shop, temple'
];

const router = Router();

router.get('/examples', (_req, res) => {
  res.json({ examples: EXAMPLES });
});

export default router;
