# Urbanexus

AI-powered Urban Infrastructure Intelligence Platform for **Ahmedabad Municipal Corporation (AMC)**.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS + Framer Motion + Recharts
- Leaflet / OpenStreetMap (client-only)
- Supabase-ready clients (Auth/DB/Storage)
- **Exa AI** for search, answer, find-similar, and research

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment

```env
EXA_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The app builds and deploys without keys. Exa routes return a clear `503` if `EXA_API_KEY` is missing. Reports use an in-memory service until Supabase tables are wired.

## Scripts

- `npm run dev` — local development
- `npm run build` — production build (Vercel)
- `npm run start` — serve production build
- `npm run lint` — ESLint

## Deploy on Vercel

1. Import this repo in Vercel
2. Framework preset: Next.js
3. Add env vars from `.env.example`
4. Deploy

## API

All routes under `app/api/` return:

```json
{ "success": true, "data": {}, "message": "" }
```

or

```json
{ "success": false, "error": "", "message": "" }
```

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health + env status |
| GET/POST | `/api/reports` | List / create reports |
| POST | `/api/search` | Exa search |
| POST | `/api/answer` | Exa answer |
| POST | `/api/research` | Exa research brief |
| POST | `/api/similar` | Exa find similar |
