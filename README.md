# Urbanexus

AI-powered Urban Infrastructure Intelligence Platform for **Ahmedabad Municipal Corporation (AMC) that help the citizen to share problem with main auth**.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS + Framer Motion + Recharts + Sonner
- Leaflet / OpenStreetMap (clusters, heatmap, ward boundaries)
- Supabase-ready clients
- **Exa AI only** for report triage, standards research, search, and answers

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Citizen | `aarav.sharma@gmail.com` | `demo1234` |
| Admin | `admin@amc.gov.in` | `admin1234` |

## Quick start

```bash
npm install
cp .env.example .env.local
# set EXA_API_KEY in .env.local
npm run dev
```

## Environment

```env
EXA_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Set `EXA_API_KEY` in Vercel Project Settings → Environment Variables. Never commit secrets.

The app still builds without keys; Exa routes degrade gracefully with heuristic triage when offline.

## Portals

- `/login` — authentication
- `/citizen/*` — citizen dashboard, reports, rewards, leaderboard, notifications, profile
- `/admin/*` — ops dashboard, report management, priority queue, analytics, urban pulse
- `/map` — enterprise GIS
- `/intel` — Exa research console

## Deploy on Vercel

1. Import the GitHub repo
2. Framework: Next.js (auto-detected)
3. Add `EXA_API_KEY`
4. Deploy
