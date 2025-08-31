# Itinerary Genie

AI-powered trip choreographer that turns a short to‑do list into an ordered, review‑aware route you can follow on a map.

Monorepo: React + Vite client, Express + TypeScript server.

## What it does (AI agent pipeline)

Given a free‑text to‑do list and a starting location, the server acts as a set of cooperating AI agents that:

1) Parse your to‑do list (Agent: Task Parser)
- Input: free text like “museum, coffee, dinner near Old Delhi” plus optional coordinates/city.
- Process: calls an LLM to extract normalized tasks with hints (type, category_hint, tags, fixed vs flexible).
- Endpoint: POST /api/parse-tasks

2) Find candidate places (Agent: Place Finder)
- For each flexible task, queries Foursquare Places to find nearby venues.
- Source: server/src/places/foursquare.ts (searchPlaces, getPlaceDetails)
- Endpoint example using it: GET /api/search-places

3) Filter relevance (Agent: Relevance Checker)
- Uses an LLM (with a heuristic fallback) to keep only places matching the intent/tags of the task.
- Source: server/src/agents/relevanceChecker.ts

4) Analyze reviews (Agent: Review Analyst)
- Uses Google Places APIs to find the Google place_id from name/address, then pull reviews.
- Runs an LLM to turn raw reviews into aspect scores and an overall rating used in scoring.
- Sources: server/src/places/googlePlaceId.ts, server/src/places/google.ts, server/src/agents/reviewAnalyzer.ts

5) Score and select (Agent: Scorer)
- Scores candidates by relevance, reviews, distance, and user preferences; picks the best per task.
- Source: server/src/itinerary/scorer.ts

6) Order and route (Agent: Route Planner)
- Outputs an ordered list of stops (keep or optimize order) and requests directions to render on the map.
- Default routing provider: Mapbox Directions.
- Sources: server/src/routing/mapbox.ts (used by POST /api/route)
- Optional/alternative (not wired by default): server/src/routing/openrouteservice.ts

7) Live progress updates
- Provides coarse progress via Server‑Sent Events so the UI can show steps like “Searching locations…”.
- Source: server/src/progress.ts (SSE) exposed at GET /api/generate-progress

Other utilities
- Geocoding: GET /api/geocode uses OpenStreetMap Nominatim to turn text or lat,lon into a location.
- Examples: GET /api/examples returns sample prompts shown in the UI.

## External APIs and where they’re used

- Foursquare Places API
    - Purpose: Nearby place discovery for task candidates.
    - Where: server/src/places/foursquare.ts; called by server/src/api/searchPlaces.ts and server/src/itinerary/generator.ts.

- Google Places API
    - Purpose: place_id resolution (Find Place) and pulling reviews (Place Details) for review analysis.
    - Where: server/src/places/googlePlaceId.ts, server/src/places/google.ts; used in server/src/itinerary/generator.ts.

- Mapbox Directions API
    - Purpose: route polyline + distance/duration between origin and selected stops.
    - Where: server/src/routing/mapbox.ts; invoked by POST /api/route; rendered by client Mapbox GL.

- OpenStreetMap Nominatim
    - Purpose: geocoding user‑typed addresses or lat,lon to coordinates/city.
    - Where: server/src/api/geocode.ts

## Quick start

Prereqs: Node.js 18+ and npm.

1) Install dependencies
```bash
npm install
```

2) Configure environment
- Create server/.env (server uses dotenv):

```
# Server
PORT=3001

# LLM provider: openai or mock
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
# Optional tuning
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0

# Places
FOURSQUARE_API_KEY=fsq-your-key
FOURSQUARE_API_VERSION=2025-06-17
GOOGLE_MAPS_API_KEY=AIza-your-key

# Routing
MAPBOX_TOKEN=pk.your-mapbox-access-token
# Optional alternative router (not enabled by default)
ORS_TOKEN=your-openrouteservice-token
```

- Create client/.env (Vite):

```
VITE_MAPBOX_TOKEN=pk.your-mapbox-access-token
```

3) Run in development
```bash
npm run dev
```
- Starts server (http://localhost:3001) and client (http://localhost:5173) with the Vite proxy to /api.

4) Build for production
```bash
npm run build --workspace server
npm run build --workspace client
npm run start
```

## Using the app

- Enter a short to‑do list (e.g., “museum, coffee, dinner”).
- Pick a starting location (type an address/city or use your current location).
- Choose order mode: keep input order or let the planner optimize.
- Click Generate to see stops, ratings, and a route drawn on the map. Drag to reorder stops and the route updates.

## API map (server)

- GET /health — health check
- GET /api/examples — sample prompts
- GET /api/geocode?q= — OSM Nominatim geocoding
- GET /api/search-places?q=&lat=&lon=&maxResults= — Foursquare search
- POST /api/parse-tasks — LLM task parsing
- POST /api/generate-itinerary — orchestrates the full agent pipeline
- GET /api/generate-progress?jobId= — SSE progress stream
- POST /api/route — Mapbox Directions routing
- POST /api/analyze-reviews — LLM review analysis (also used internally)

## Folder structure

```
/itinerary_genie
├── package.json         # monorepo root (workspaces: server, client)
├── README.md
├── server/              # Express + TypeScript API
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── api/         # REST endpoints
│       ├── agents/      # LLM-powered agents (relevance, review analysis)
│       ├── itinerary/   # generator + scoring
│       ├── places/      # Foursquare + Google integrations
│       └── routing/     # Mapbox (and optional ORS) routing
└── client/              # Vite + React + TypeScript
        ├── package.json
        ├── vite.config.ts   # /api proxy to server
        └── src/
                ├── components/  # Input panel, map, itinerary list
                └── services/    # API client
```

## Notes
- Client map rendering requires VITE_MAPBOX_TOKEN; the server’s MAPBOX_TOKEN is used for routing.
- LLM_PROVIDER can be set to mock for offline/demo behavior that skips real LLM calls.
- Simple rate limiting is applied per IP on the server.

## Dev tips
- Run server tests: `npm run test --workspace server`
- The client dev server proxies /api to http://localhost:3001 (config in client/vite.config.ts).
