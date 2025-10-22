-- Enable RLS and define visibility policies

alter table memory enable row level security;

-- Select: owner, participants, or PUBLIC
drop policy if exists memory_select on memory;
create policy memory_select on memory
  for select using (
    visibility = 'PUBLIC'
    or owner_id = current_setting('app.user_id', true)::uuid
    or exists (
      select 1 from participant p
      where p.memory_id = memory.id
        and p.user_id = current_setting('app.user_id', true)::uuid
    )
  );

-- Update (visibility/title): owner only
drop policy if exists memory_update on memory;
create policy memory_update on memory
  for update using (
    owner_id = current_setting('app.user_id', true)::uuid
  );

-- Insert: owner inserts only; enforce owner_id matches current user
drop policy if exists memory_insert on memory;
create policy memory_insert on memory
  for insert with check (
    owner_id = current_setting('app.user_id', true)::uuid
  );

-- Child tables mirror parent visibility via EXISTS parent
alter table memory_core_version enable row level security;
drop policy if exists mcv_select on memory_core_version;
create policy mcv_select on memory_core_version
  for select using (
    exists (
      select 1 from memory m
      where m.id = memory_core_version.memory_id
    )
  );

-- Insert: allow if user owns the parent memory
drop policy if exists mcv_insert on memory_core_version;
create policy mcv_insert on memory_core_version
  for insert with check (
    exists (
      select 1 from memory m
      where m.id = memory_core_version.memory_id
        and m.owner_id = current_setting('app.user_id', true)::uuid
    )
  );

-- Update: allow owner of parent memory to lock drafts
drop policy if exists mcv_update on memory_core_version;
create policy mcv_update on memory_core_version
  for update using (
    exists (
      select 1 from memory m
      where m.id = memory_core_version.memory_id
        and m.owner_id = current_setting('app.user_id', true)::uuid
    )
  );

alter table memory_layer enable row level security;
drop policy if exists layer_select on memory_layer;
create policy layer_select on memory_layer
  for select using (
    exists (
      select 1 from memory m
      where m.id = memory_layer.memory_id
    )
  );

-- Insert: allow if user owns the parent memory (MVP)
drop policy if exists layer_insert on memory_layer;
create policy layer_insert on memory_layer
  for insert
  with check (
    exists (
      select 1 from memory m
      where m.id = memory_layer.memory_id
        and (
          m.owner_id = current_setting('app.user_id', true)::uuid
          or exists (
            select 1 from participant p
            where p.memory_id = m.id
              and p.user_id = current_setting('app.user_id', true)::uuid
              and p.role in ('OWNER','CONTRIBUTOR')
          )
        )
    )
  );

alter table artifact enable row level security;
drop policy if exists artifact_select on artifact;
create policy artifact_select on artifact
  for select using (
    exists (
      select 1 from memory m
      where m.id = artifact.memory_id
    )
  );

drop policy if exists artifact_insert on artifact;
create policy artifact_insert on artifact
  for insert
  with check (
    exists (
      select 1 from memory m
      where m.id = artifact.memory_id
        and (
          m.owner_id = current_setting('app.user_id', true)::uuid
          or exists (
            select 1 from participant p
            where p.memory_id = m.id
              and p.user_id = current_setting('app.user_id', true)::uuid
              and p.role in ('OWNER','CONTRIBUTOR')
          )
        )
    )
  );

alter table participant enable row level security;
drop policy if exists participant_select on participant;
create policy participant_select on participant
  for select using (
    exists (
      select 1 from memory m
      where m.id = participant.memory_id
    )
  );

-- Insert: allow if user owns the parent memory
drop policy if exists participant_insert on participant;
create policy participant_insert on participant
  for insert with check (
    exists (
      select 1 from memory m
      where m.id = participant.memory_id
        and m.owner_id = current_setting('app.user_id', true)::uuid
    )
  );

-- Update/Delete: owner of parent memory only
drop policy if exists participant_update on participant;
create policy participant_update on participant
  for update using (
    exists (
      select 1 from memory m
      where m.id = participant.memory_id
        and m.owner_id = current_setting('app.user_id', true)::uuid
    )
  );

drop policy if exists participant_delete on participant;
create policy participant_delete on participant
  for delete using (
    exists (
      select 1 from memory m
      where m.id = participant.memory_id
        and m.owner_id = current_setting('app.user_id', true)::uuid
    )
  );

alter table memory_edge enable row level security;
drop policy if exists edge_select on memory_edge;
create policy edge_select on memory_edge
  for select using (
    exists (
      select 1 from memory m
      where m.id in (memory_edge.a_memory_id, memory_edge.b_memory_id)
    )
  );

drop policy if exists edge_insert on memory_edge;
create policy edge_insert on memory_edge
  for insert
  with check (
    exists (
      select 1 from memory m
      where m.id = memory_edge.a_memory_id and m.owner_id = current_setting('app.user_id', true)::uuid
    )
    or exists (
      select 1 from memory m
      where m.id = memory_edge.b_memory_id and m.owner_id = current_setting('app.user_id', true)::uuid
    )
  );

-- Note: application must SET LOCAL app.user_id per request
