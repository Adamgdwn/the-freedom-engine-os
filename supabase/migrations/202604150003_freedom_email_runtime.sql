create table if not exists freedom_email_recipients (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  destination text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freedom_email_recipients_label_idx
  on freedom_email_recipients (label);

alter table freedom_email_recipients enable row level security;

create table if not exists freedom_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  subject text not null,
  provider text not null check (provider in ('resend')),
  delivery_id text not null,
  delivered_at timestamptz not null default now()
);

create index if not exists freedom_email_deliveries_delivered_at_idx
  on freedom_email_deliveries (delivered_at desc);

alter table freedom_email_deliveries enable row level security;
