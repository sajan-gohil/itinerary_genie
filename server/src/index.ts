import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { config } from './config';
import parseTasksRouter from './api/parseTasks';
import searchPlacesRouter from './api/searchPlaces';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Simple in-memory rate limiter per IP
const ipRateLimit: Record<string, { count: number; last: number }> = {};
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // max requests per window

app.use((req, res, next) => {
  const ip = req.ip ?? req.connection.remoteAddress ?? 'unknown';
  const now = Date.now();
  if (!ip || typeof ip !== 'string') {
    return res.status(400).json({ error: 'Unable to determine IP address' });
  }
  if (!ipRateLimit[ip] || now - ipRateLimit[ip].last > RATE_LIMIT_WINDOW) {
    ipRateLimit[ip] = { count: 1, last: now };
  } else {
    ipRateLimit[ip].count++;
    ipRateLimit[ip].last = now;
  }
  if (ipRateLimit[ip].count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  next();
});

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});


app.use('/api', parseTasksRouter);

app.post('/api/generate-itinerary', (req, res) => {
  // TODO: Implement itinerary generation logic
  res.json({ message: 'generate-itinerary endpoint' });
});

app.get('/api/place-details/:source/:placeId', (req, res) => {
  // TODO: Implement place details logic
  const { source, placeId } = req.params;
  res.json({ source, placeId, details: null });
});


app.use('/api', searchPlacesRouter);

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});
