-- Idempotency keys for write endpoints
create table if not exists idempotency_key (
  user_id uuid not null references app_user(id),
  endpoint text not null,
  key text not null,
  created_at timestamptz default now(),
  resource_id uuid,
  primary key (user_id, endpoint, key)
);

