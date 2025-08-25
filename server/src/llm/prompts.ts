export const PARSE_TASKS_PROMPT = `
System: You are a JSON generator that converts a free-form "to-do" list into structured tasks for an itinerary planner. Always reply with valid JSON only.

User: Convert this input into an array of task objects. Each object must include:
 - id: unique short id (t1, t2...)
 - raw: original text chunk
 - type: "fixed" if an explicit place or address is present, otherwise "flexible"
 - location_hint: optional — the explicit place name or address if present
 - category_hint: optional — a short category string (e.g., "spa", "restaurant", "shopping", "movie_theater", "coffee")
 - max_candidates: integer (default 3)

Input:
{ "text": "SPA, shopping, dinner at Chandni Chowk, movie, home" }

Output:
{
  "tasks": [
    { "id": "t1", "raw": "SPA", "type": "flexible", "category_hint": "spa", "max_candidates": 3 },
    { "id": "t2", "raw": "shopping", "type": "flexible", "category_hint": "shopping", "max_candidates": 3 },
    { "id": "t3", "raw": "dinner at Chandni Chowk", "type": "fixed", "location_hint": "Chandni Chowk", "category_hint": "restaurant", "max_candidates": 3 },
    { "id": "t4", "raw": "movie", "type": "flexible", "category_hint": "movie_theater", "max_candidates": 3 },
    { "id": "t5", "raw": "home", "type": "fixed", "location_hint": "home", "category_hint": "home", "max_candidates": 3 }
  ]
}

Guidelines:
- Only reply with valid JSON in the specified format.
- If the user provides a location (city or lat/lon), use it to help with location_hint or candidate selection.
- Use short, relevant category_hint values.
- Do NOT return anything except the JSON object.
`;
