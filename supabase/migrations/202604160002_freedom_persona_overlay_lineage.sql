alter table freedom_persona_overlays
  add column if not exists source text not null default 'freedom'
    check (source in ('freedom', 'operator')),
  add column if not exists change_type text not null default 'new'
    check (change_type in ('new', 'revision', 'retirement')),
  add column if not exists target_overlay_id text references freedom_persona_overlays (id);

create index if not exists freedom_persona_overlays_target_overlay_id_idx
  on freedom_persona_overlays (target_overlay_id);
