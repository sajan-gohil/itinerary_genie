# Itinerary Genie Monorepo

This monorepo contains both the server (Node.js + Express) and client (Vite + React) projects for Itinerary Genie.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

This will install dependencies for both `server` and `client` using npm workspaces.

### 2. Run in development mode

```bash
npm run dev
```

This will start both the server (with hot reload) and the client (Vite dev server) concurrently.

### 3. Build and start production

```bash
npm run build --workspace server
npm run build --workspace client
npm run start
```

## Folder Structure

```
/itinerary_genie
├── package.json         # Monorepo root
├── README.md            # This file
├── server/              # Express + TypeScript API
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
└── client/              # Vite + React + TypeScript frontend
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        └── App.tsx
```

## Notes
- The server runs on the port specified by the `PORT` environment variable (default: 3001).
- The client runs on port 5173 by default.
- You can add environment variables in `.env` files in each subproject.
