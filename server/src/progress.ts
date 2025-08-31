import { Response, Request } from 'express';

const streams = new Map<string, Response>();

export function addStream(jobId: string, res: Response) {
  streams.set(jobId, res);
}

export function removeStream(jobId: string) {
  const res = streams.get(jobId);
  if (res) {
    try { res.end(); } catch {}
  }
  streams.delete(jobId);
}

export function sendProgress(jobId: string, message: string) {
  const res = streams.get(jobId);
  if (!res) return;
  res.write(`data: ${message}\n\n`);
}

export function handleProgressRoute(req: Request, res: Response) {
  const jobId = (req.query.jobId as string) || '';
  if (!jobId) {
    res.status(400).end('Missing jobId');
    return;
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  addStream(jobId, res);
  // keepalive ping
  const ping = setInterval(() => {
    try { res.write(': keepalive\n\n'); } catch {}
  }, 15000);
  req.on('close', () => {
    clearInterval(ping);
    removeStream(jobId);
  });
}
