create table if not exists freedom_contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  preferred_name text,
  organization text,
  title text,
  relationship_context text,
  notes text,
  status text not null default 'active' check (status in ('active', 'archived')),
  source_kind text not null default 'manual',
  source_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freedom_contacts_full_name_idx
  on freedom_contacts (full_name);

create index if not exists freedom_contacts_updated_at_idx
  on freedom_contacts (updated_at desc);

alter table freedom_contacts enable row level security;

create table if not exists freedom_contact_channels (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references freedom_contacts(id) on delete cascade,
  channel_type text not null check (channel_type in ('email', 'phone', 'website', 'address', 'other')),
  label text,
  value text not null,
  is_primary boolean not null default false,
  trust_for_email boolean not null default false,
  approval_required boolean not null default true,
  status text not null default 'active' check (status in ('active', 'archived')),
  source_kind text not null default 'manual',
  source_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contact_id, channel_type, value)
);

create index if not exists freedom_contact_channels_contact_idx
  on freedom_contact_channels (contact_id);

create index if not exists freedom_contact_channels_email_idx
  on freedom_contact_channels (channel_type, trust_for_email, value);

alter table freedom_contact_channels enable row level security;

insert into freedom_contacts (
  full_name,
  preferred_name,
  organization,
  title,
  relationship_context,
  notes,
  status,
  source_kind,
  source_detail,
  created_at,
  updated_at
)
select
  r.label,
  null,
  null,
  null,
  'Imported from legacy trusted recipient registry.',
  null,
  'active',
  'legacy_email_recipient',
  'freedom_email_recipients',
  r.created_at,
  r.updated_at
from freedom_email_recipients r
where not exists (
  select 1
  from freedom_contacts c
  where c.source_kind = 'legacy_email_recipient'
    and c.source_detail = 'freedom_email_recipients'
    and c.full_name = r.label
);

insert into freedom_contact_channels (
  contact_id,
  channel_type,
  label,
  value,
  is_primary,
  trust_for_email,
  approval_required,
  status,
  source_kind,
  source_detail,
  created_at,
  updated_at
)
select
  c.id,
  'email',
  'Primary email',
  r.destination,
  true,
  true,
  true,
  'active',
  'legacy_email_recipient',
  'freedom_email_recipients',
  r.created_at,
  r.updated_at
from freedom_email_recipients r
join freedom_contacts c
  on c.full_name = r.label
 and c.source_kind = 'legacy_email_recipient'
 and c.source_detail = 'freedom_email_recipients'
where not exists (
  select 1
  from freedom_contact_channels ch
  where ch.contact_id = c.id
    and ch.channel_type = 'email'
    and lower(ch.value) = lower(r.destination)
);
