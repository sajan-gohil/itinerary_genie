import axios from 'axios';

export async function parseTasks(text: string, location?: { lat?: number; lon?: number; city?: string }) {
  const res = await axios.post('/api/parse-tasks', { text, location });
  return res.data;
}

export async function generateItinerary({ tasks, origin, mode, transportMode, jobId }: any) {
  const res = await axios.post('/api/generate-itinerary', { tasks, origin, mode, transportMode, jobId });
  return res.data;
}

export async function getRoute(routeRequest: any) {
  const res = await axios.post('/api/route', routeRequest);
  return res.data;
}

export async function geocodeAddress(q: string) {
  const res = await axios.get('/api/geocode', { params: { q } });
  return res.data; // { lat, lon, city, raw }
}

export async function getExamples() {
  const res = await axios.get('/api/examples');
  return res.data.examples as string[];
}

// Progress stream via SSE
export function listenGenerateProgress(jobId: string, onMessage: (msg: string) => void): EventSource {
  const es = new EventSource(`/api/generate-progress?jobId=${encodeURIComponent(jobId)}`);
  es.onmessage = (e) => {
    if (e?.data) onMessage(e.data);
  };
  return es;
}
