import { getAdapter, LLMProvider } from '../llm/adapter';
import type { Task, CandidatePlace } from '../itinerary/scorer';

type RelevanceResult = {
  relevant: boolean;
  reason?: string;
};

function buildPrompt(task: Task, candidate: CandidatePlace, context?: { distanceKm?: number }) {
  const parts: string[] = [];
  parts.push(`You are a strict filter that decides if a place is relevant for a user's task.`);
  parts.push(`Return ONLY a JSON object like { "relevant": true|false, "reason": "short" } with no extra text.`);
  parts.push(`If the place clearly doesn't fit the task intent/category, mark relevant=false.`);
  parts.push('');
  parts.push('Task:');
  parts.push(JSON.stringify({
    id: task.id,
    type: (task as any).type,
    raw: (task as any).raw,
    category_hint: (task as any).category_hint,
    required_tags: (task as any).required_tags,
    location_hint: (task as any).location_hint,
  }));
  parts.push('');
  parts.push('Candidate place:');
  parts.push(JSON.stringify({
    id: candidate.id,
    name: candidate.name,
    tags: candidate.tags,
    location: candidate.location,
    distance_km: context?.distanceKm,
  }));
  parts.push('');
  parts.push('Rules:');
  parts.push('- Prefer category_hint and required_tags to judge intent.');
  parts.push('- Generic mismatches (e.g., "spa" task but a burger joint) should be false.');
  parts.push('- If ambiguous but likely okay, set true. Be concise.');
  return parts.join('\n');
}

function extractJson(text: string): RelevanceResult {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in LLM output');
  const obj = JSON.parse(match[0]);
  return { relevant: !!obj.relevant, reason: obj.reason };
}

function heuristic(task: Task, candidate: CandidatePlace): RelevanceResult {
  const name = (candidate.name || '').toLowerCase();
  const tags = (candidate.tags || []).map(t => (t || '').toLowerCase());
  const raw = ((task as any).raw || '').toLowerCase();
  const category = ((task as any).category_hint || '').toLowerCase().replace(/_/g, ' ');
  const needles = [category, raw]
    .filter(Boolean)
    .flatMap(s => s.split(/[^a-z0-9]+/).filter(Boolean));
  // basic match: any needle in name or tags
  const matched = needles.length === 0 ? true : needles.some(n => name.includes(n) || tags.some(t => t.includes(n)));
  return { relevant: matched, reason: matched ? 'basic match' : 'no basic match' };
}

export async function checkCandidateRelevance(task: Task, candidate: CandidatePlace, provider: LLMProvider = 'openai', context?: { distanceKm?: number }): Promise<RelevanceResult> {
  try {
    const adapter = getAdapter(provider);
    const prompt = buildPrompt(task, candidate, context);
    const raw = await adapter.generate(prompt);
    return extractJson(raw);
  } catch (e) {
    // Fallback to heuristic on any error (missing key, network, JSON issues)
    return heuristic(task, candidate);
  }
}
