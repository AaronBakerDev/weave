-- Weave v1 schema (Postgres 16 + pgvector)
create extension if not exists vector;

-- Users
create table if not exists app_user (
  id uuid primary key,
  handle text unique not null,
  display_name text,
  created_at timestamptz default now()
);

-- Memories
create table if not exists memory (
  id uuid primary key,
  owner_id uuid not null references app_user(id),
  visibility text not null check (visibility in ('PRIVATE','SHARED','PUBLIC')),
  title text,
  created_at timestamptz default now(),
  status text not null default 'ACTIVE',
  current_core_version int,
  embedding vector(1536),
  tsv tsvector
);

-- Core versions (event-sourced)
create table if not exists memory_core_version (
  id bigserial primary key,
  memory_id uuid not null references memory(id) on delete cascade,
  version int not null,
  narrative text not null,
  anchors jsonb not null default '[]',
  people jsonb not null default '[]',
  "when" tstzrange,
  "where" text,
  locked boolean not null default false,
  created_by uuid not null references app_user(id),
  created_at timestamptz default now(),
  unique(memory_id, version)
);

-- At most one draft core per memory
create unique index if not exists ux_core_one_draft
  on memory_core_version(memory_id) where locked = false;

-- Layers (append-only)
create table if not exists memory_layer (
  id uuid primary key,
  memory_id uuid not null references memory(id) on delete cascade,
  author_id uuid not null references app_user(id),
  kind text not null check (kind in ('TEXT','IMAGE','VIDEO','AUDIO','REFLECTION','LINK')),
  text_content text,
  meta jsonb not null default '{}',
  artifact_id uuid,
  created_at timestamptz default now()
);

-- Artifacts (S3-backed)
create table if not exists artifact (
  id uuid primary key,
  memory_id uuid not null references memory(id) on delete cascade,
  owner_id uuid not null references app_user(id),
  mime text not null,
  storage_key text not null,
  sha256 text not null,
  bytes bigint not null,
  created_at timestamptz default now(),
  unique(owner_id, sha256)
);

-- Participants / roles
create table if not exists participant (
  memory_id uuid not null references memory(id) on delete cascade,
  user_id uuid not null references app_user(id),
  role text not null check (role in ('OWNER','CONTRIBUTOR','VIEWER')),
  invited_by uuid references app_user(id),
  joined_at timestamptz default now(),
  primary key (memory_id, user_id)
);
create index if not exists idx_participant_user on participant(user_id);
create index if not exists idx_participant_memory on participant(memory_id);

-- Weaving edges
create table if not exists memory_edge (
  id uuid primary key,
  a_memory_id uuid not null references memory(id) on delete cascade,
  b_memory_id uuid not null references memory(id) on delete cascade,
  relation text not null check (relation in ('SAME_PERSON','SAME_EVENT','THEME','EMOTION','TIME_NEAR')),
  strength real not null default 0.5,
  note text,
  created_by uuid not null references app_user(id),
  created_at timestamptz default now(),
  check (a_memory_id <> b_memory_id),
  check (strength >= 0 and strength <= 1)
);
create unique index if not exists ux_edge_pair_rel on memory_edge(a_memory_id, b_memory_id, relation);

-- Invites
create table if not exists invite (
  token uuid primary key,
  memory_id uuid not null references memory(id) on delete cascade,
  role text not null check (role in ('CONTRIBUTOR','VIEWER')),
  invited_email text,
  created_by uuid not null references app_user(id),
  expires_at timestamptz not null,
  accepted_by uuid references app_user(id),
  accepted_at timestamptz
);

-- Public mirror (Option B foundations)
create table if not exists public_memory_slug (
  memory_id uuid primary key references memory(id) on delete cascade,
  slug text unique not null,
  created_at timestamptz default now()
);

-- Lightweight follows (Option B)
create table if not exists user_follow (
  follower_id uuid not null references app_user(id),
  followee_id uuid not null references app_user(id),
  created_at timestamptz default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

-- Optional RSVP placeholders for a future public event model
create table if not exists public_event (
  id uuid primary key,
  owner_id uuid not null references app_user(id),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists event_rsvp (
  event_id uuid not null references public_event(id) on delete cascade,
  user_id uuid not null references app_user(id),
  status text not null check (status in ('GOING','INTERESTED','NOTIFIED')),
  created_at timestamptz default now(),
  primary key (event_id, user_id)
);

-- Search indexes
create index if not exists idx_memory_embed on memory using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists idx_memory_tsv on memory using gin(tsv);

