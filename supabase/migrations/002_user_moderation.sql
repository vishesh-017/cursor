-- Citizen moderation fields + audit log
alter table public.users
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'flagged', 'suspended', 'removed')),
  add column if not exists flag_count integer not null default 0,
  add column if not exists moderation_note text,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by text;

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

alter table public.moderation_events enable row level security;
