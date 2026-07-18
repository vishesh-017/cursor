# Urbanexus

AI-powered Urban Infrastructure Intelligence Platform for **Ahmedabad Municipal Corporation (AMC)**.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS + Framer Motion + Recharts + Sonner
- Leaflet / OpenStreetMap (clusters, heatmap, ward boundaries)
- Supabase-ready clients
- **Gemini** for infrastructure vision analysis
- **Exa AI** for standards research and contextual knowledge

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Citizen | `aarav.sharma@gmail.com` | `demo1234` |
| Admin | `admin@amc.gov.in` | `admin1234` |

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment

```env
EXA_API_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The app builds without keys. Gemini falls back to heuristic analysis; Exa routes return clear errors when unset.

## Portals

- `/login` — authentication
- `/citizen/*` — citizen dashboard, reports, rewards, leaderboard, notifications, profile
- `/admin/*` — ops dashboard, report management, priority queue, analytics, urban pulse, wards, departments
- `/map` — enterprise GIS
- `/intel` — Exa research console

## Deploy on Vercel

1. Import the GitHub repo
2. Framework: Next.js
3. Add env vars
4. Deploy
