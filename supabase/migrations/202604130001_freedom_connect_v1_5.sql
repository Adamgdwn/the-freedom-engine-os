create table if not exists connect_sessions (
  id uuid primary key default gen_random_uuid(),
  freedom_session_id text not null unique,
  title text not null,
  assistant_name text not null default 'Freedom',
  origin_surface text not null,
  session_kind text not null,
  root_path text not null,
  workspace_label text not null,
  audit_correlation_id text not null,
  status text not null,
  last_summary text not null,
  started_at timestamptz not null,
  last_activity_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists connect_events (
  id uuid primary key default gen_random_uuid(),
  connect_session_id uuid not null references connect_sessions(id) on delete cascade,
  source_surface text not null,
  communication_intent text not null,
  summary text not null,
  governance_impact text not null,
  created_at timestamptz not null default now()
);

create table if not exists trusted_contact_policies (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  scope text not null,
  trusted_recipients jsonb not null default '[]'::jsonb,
  approval_required boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists outbound_decisions (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  recipient text not null,
  summary text not null,
  approval_state text not null,
  created_at timestamptz not null default now()
);

create table if not exists agent_build_requests (
  id uuid primary key default gen_random_uuid(),
  capability text not null,
  requested_from text not null,
  requested_by text not null,
  status text not null,
  builder text not null,
  route_reason text not null,
  audit_correlation_id text not null,
  requested_at timestamptz not null,
  created_at timestamptz not null default now()
);
