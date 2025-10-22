alter table memory_core_version add column if not exists locked_at timestamptz;
-- Backfill: set locked_at to created_at where locked = true and locked_at is null
update memory_core_version set locked_at = created_at where locked = true and locked_at is null;

