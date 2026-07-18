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

## Shared database (multi-laptop)

Without Supabase, each laptop uses **local memory** — a report filed on one machine will not appear on another.

To sync:

1. Create a free project at [supabase.com](https://supabase.com/dashboard)
2. Paste **the same** URL + anon key + service role key into `.env.local` on every laptop
3. Run `supabase/migrations/001_urbanexus.sql` in the Supabase SQL Editor
4. Restart `npm run dev`, open **Admin → Database**, click **Seed demo data**
5. File a report on laptop A — laptop B’s Reports / Priority Queue refresh every ~8s

Status API: `GET /api/db/status` · Seed: `POST /api/db/seed`

## Portals

- `/login` — authentication
- `/citizen/*` — citizen dashboard, reports, rewards, leaderboard, notifications, profile
- `/admin/*` — ops dashboard, report management, priority queue, analytics, urban pulse
- `/map` — enterprise GIS
- `/intel` — Exa research console

## Deploy on Vercel

1. Import the GitHub repo
2. Framework: Next.js (auto-detected)
3. Add environment variables (Production + Preview):

```env
EXA_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

Aliases also work: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.

4. In Supabase → SQL Editor, run `supabase/setup_all.sql` (required once — keys alone are not enough)
5. Deploy, then seed: `POST https://YOUR_APP.vercel.app/api/db/seed` (or Admin → Database → Seed)
6. Open the **same Vercel URL** on every laptop for shared reports
