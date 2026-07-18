-- Urbanexus schema for Supabase Postgres
-- Run in Supabase SQL Editor (or: supabase db push)

create table if not exists public.users (
  id text primary key,
  name text not null,
  email text not null unique,
  phone text not null default '',
  role text not null check (role in ('citizen', 'admin', 'officer')),
  ward text not null,
  admin_scope text check (admin_scope is null or admin_scope in ('city', 'ward')),
  managed_wards text[] not null default '{}',
  avatar_url text not null default '',
  points integer not null default 0,
  badges text[] not null default '{}',
  joined_at timestamptz not null default now(),
  reports_count integer not null default 0,
  resolved_count integer not null default 0,
  account_status text not null default 'active'
    check (account_status in ('active', 'flagged', 'suspended', 'removed')),
  flag_count integer not null default 0,
  moderation_note text,
  moderated_at timestamptz,
  moderated_by text
);

create table if not exists public.wards (
  id text primary key,
  name text not null unique,
  zone text not null,
  population integer not null default 0,
  center jsonb not null default '{"lat":23.02,"lng":72.57}',
  boundary jsonb not null default '[]',
  health_score integer not null default 70,
  open_issues integer not null default 0
);

create table if not exists public.departments (
  id text primary key,
  name text not null,
  head text not null default '',
  open_issues integer not null default 0,
  resolved_issues integer not null default 0,
  avg_resolution_hours integer not null default 48,
  efficiency integer not null default 70
);

create table if not exists public.badges (
  id text primary key,
  name text not null,
  description text not null default '',
  icon text not null default 'award',
  points_required integer not null default 0
);

create table if not exists public.rewards (
  id text primary key,
  title text not null,
  description text not null default '',
  points_cost integer not null default 0,
  available boolean not null default true
);

create table if not exists public.leaderboard_entries (
  user_id text primary key,
  rank integer not null default 0,
  name text not null,
  ward text not null,
  points integer not null default 0,
  reports integer not null default 0,
  badges integer not null default 0
);

create table if not exists public.reports (
  id text primary key,
  title text not null,
  description text not null,
  category text not null,
  status text not null,
  priority text not null,
  ward text not null,
  ward_id text not null,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  citizen_id text not null references public.users (id) on delete cascade,
  citizen_name text not null,
  assigned_to text,
  department_id text not null,
  image_url text,
  image_urls text[] not null default '{}',
  ai jsonb,
  timeline jsonb not null default '[]',
  points_awarded integer not null default 0
);

create index if not exists reports_updated_at_idx on public.reports (updated_at desc);
create index if not exists reports_status_idx on public.reports (status);
create index if not exists reports_ward_idx on public.reports (ward);
create index if not exists reports_citizen_id_idx on public.reports (citizen_id);
create index if not exists reports_department_id_idx on public.reports (department_id);

create table if not exists public.notifications (
  id text primary key,
  user_id text not null references public.users (id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read boolean not null default false,
  href text not null default '/'
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create table if not exists public.moderation_events (
  id text primary key,
  user_id text not null references public.users (id) on delete cascade,
  action text not null check (action in ('flag', 'suspend', 'remove', 'reinstate')),
  reason text not null,
  report_id text,
  actor_id text not null,
  actor_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists moderation_events_user_idx
  on public.moderation_events (user_id, created_at desc);

-- Service role bypasses RLS; lock down anon/authenticated by default.
alter table public.users enable row level security;
alter table public.wards enable row level security;
alter table public.departments enable row level security;
alter table public.badges enable row level security;
alter table public.rewards enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.moderation_events enable row level security;
