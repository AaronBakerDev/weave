-- Event table for indexing pipeline
create table if not exists memory_event (
  id bigserial primary key,
  memory_id uuid not null references memory(id) on delete cascade,
  kind text not null check (kind in ('INDEX_MEMORY')),
  created_at timestamptz default now()
);

create index if not exists idx_memory_event_memory on memory_event(memory_id);
