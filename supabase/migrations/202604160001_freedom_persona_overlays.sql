create table if not exists freedom_persona_overlays (
  id text primary key,
  title text not null,
  instruction text not null,
  rationale text not null default '',
  status text not null check (status in ('pending', 'approved', 'denied', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freedom_persona_overlays_updated_at_idx
  on freedom_persona_overlays (updated_at desc);

alter table freedom_persona_overlays enable row level security;
