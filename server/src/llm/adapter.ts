export async function getLLMCompletion({ prompt, provider = 'openai' }: { prompt: string; provider?: LLMProvider }): Promise<string> {
  const adapter = getAdapter(provider);
  return adapter.generate(prompt);
}
import { config } from '../config';
import { PARSE_TASKS_PROMPT } from './prompts';

export type LLMProvider = 'openai' | 'mock';

export interface GenerateOptions {
  provider?: LLMProvider;
  apiKey?: string;
  model?: string;
  temperature?: number;
}

export interface LLMAdapter {
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
}

class OpenAIAdapter implements LLMAdapter {
  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const apiKey = options.apiKey || config.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing OpenAI API key');
    const model = options.model || process.env.OPENAI_MODEL || 'gpt-4o';
    const temperature = options.temperature ?? Number(process.env.OPENAI_TEMPERATURE ?? 0);
    const url = 'https://api.openai.com/v1/chat/completions';
    const body = {
      model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    return text;
  }
}

class MockAdapter implements LLMAdapter {
  async generate(prompt: string, _options?: GenerateOptions): Promise<string> {
    // Always return the example JSON from the prompt
    return `{
  "tasks": [
    { "id": "t1", "raw": "spa", "type": "flexible", "category_hint": "spa", "max_candidates": 3 },
    { "id": "t2", "raw": "shopping", "type": "flexible", "category_hint": "shopping", "max_candidates": 3 },
    { "id": "t3", "raw": "dinner at Chandni Chowk", "type": "fixed", "location_hint": "Chandni Chowk", "category_hint": "dinner", "max_candidates": 3 },
    { "id": "t4", "raw": "movie", "type": "flexible", "category_hint": "movie", "max_candidates": 3 }
  ]
}`;
  }
}

function extractJson(text: string): any {
  // Try to extract JSON block from LLM output
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in LLM output');
  try {
    return JSON.parse(match[0]);
  } catch (e) {
    throw new Error('Invalid JSON from LLM');
  }
}

export function getAdapter(provider: LLMProvider): LLMAdapter {
  if (provider === 'openai') return new OpenAIAdapter();
  return new MockAdapter();
}

export async function parseTasks(text: string, location?: { lat?: number; lon?: number; city?: string }, provider: LLMProvider = 'openai'): Promise<any> {
  let prompt = PARSE_TASKS_PROMPT;
  if (location) {
    if (location.city) prompt += `\nCurrent city: ${location.city}`;
    if (location.lat && location.lon) prompt += `\nCurrent location: ${location.lat},${location.lon}`;
  }
  prompt += `\nUser input: ${text}`;
  const adapter = getAdapter(provider);
  const raw = await adapter.generate(prompt);
  return extractJson(raw);
}
