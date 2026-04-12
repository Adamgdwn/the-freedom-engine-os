create extension if not exists "pgcrypto";

create table if not exists ventures (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  thesis text not null,
  target_customer text not null,
  target_market text not null,
  core_workflow_owned text not null,
  revenue_model text not null,
  current_maturity text not null,
  cost_to_date numeric(12, 2) not null default 0,
  time_to_proof_weeks integer not null,
  distribution_path text not null,
  data_moat_notes text not null,
  current_status text not null,
  created_at timestamptz not null default now()
);

create table if not exists venture_scores (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references ventures(id) on delete cascade,
  version_name text not null,
  effective_date date not null,
  weights jsonb not null,
  inputs jsonb not null,
  weighted_score numeric(6, 2) not null,
  created_at timestamptz not null default now()
);

create table if not exists experiments (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references ventures(id) on delete cascade,
  name text not null,
  hypothesis text not null,
  stage text not null,
  owner_name text not null,
  next_checkpoint date
);

create table if not exists workflows (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid not null references ventures(id) on delete cascade,
  name text not null,
  purpose text not null,
  latency_hours numeric(8, 2) not null default 0,
  ai_suitability text not null,
  governance_risk text not null,
  required_human_approvals jsonb not null default '[]'::jsonb,
  failure_points jsonb not null default '[]'::jsonb
);

create table if not exists workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  name text not null,
  actor_name text not null,
  systems_touched jsonb not null default '[]'::jsonb,
  handoff_to text not null,
  latency_minutes integer not null default 0,
  ai_suitability text not null,
  approval_required boolean not null default false,
  governance_risk text not null
);

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  model text not null,
  autonomy text not null,
  default_mode text not null,
  allowed_actions jsonb not null default '[]'::jsonb,
  blocked_actions jsonb not null default '[]'::jsonb,
  status text not null default 'draft'
);

create table if not exists humans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  authority jsonb not null default '[]'::jsonb
);

create table if not exists tools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  purpose text not null,
  approval_required text not null,
  prohibited_use text not null
);

create table if not exists policies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scope text not null,
  rule text not null,
  human_approval_required boolean not null default true
);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  owner_name text not null,
  status text not null,
  threshold_rule text not null,
  created_at timestamptz not null default now()
);

create table if not exists executions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references workflows(id) on delete set null,
  agent_id uuid references agents(id) on delete set null,
  status text not null,
  outcome text not null,
  evidence_ids jsonb not null default '[]'::jsonb,
  human_escalation boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists evidence_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  item_type text not null,
  source text not null,
  summary text not null,
  related_entity text not null,
  created_at timestamptz not null default now()
);

create table if not exists overrides (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  reason text not null,
  owner_name text not null,
  follow_up text not null,
  created_at timestamptz not null default now()
);

create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  action text not null,
  rationale text not null,
  evidence_ids jsonb not null default '[]'::jsonb,
  freedom_gain text not null,
  confidence text not null,
  created_at timestamptz not null default now()
);

create table if not exists metrics (
  id uuid primary key default gen_random_uuid(),
  venture_id uuid references ventures(id) on delete cascade,
  metric_name text not null,
  metric_value numeric(12, 2) not null,
  recorded_at timestamptz not null default now()
);

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null,
  status text not null,
  note text not null
);
