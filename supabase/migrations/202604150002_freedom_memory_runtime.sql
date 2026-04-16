create table if not exists freedom_voice_tasks (
  id text primary key,
  topic text not null,
  status text not null check (status in ('active', 'parked', 'ready', 'done')),
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freedom_voice_tasks_updated_at_idx
  on freedom_voice_tasks (updated_at desc);

alter table freedom_voice_tasks enable row level security;

create table if not exists freedom_learning_signals (
  id text primary key,
  topic text not null,
  summary text not null default '',
  kind text not null check (kind in ('preference', 'focus', 'workflow', 'capability')),
  status text not null check (status in ('observed', 'tracking', 'internalized')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freedom_learning_signals_updated_at_idx
  on freedom_learning_signals (updated_at desc);

alter table freedom_learning_signals enable row level security;

create table if not exists freedom_programming_requests (
  id text primary key,
  capability text not null,
  reason text not null,
  status text not null check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freedom_programming_requests_updated_at_idx
  on freedom_programming_requests (updated_at desc);

alter table freedom_programming_requests enable row level security;
