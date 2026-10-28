-- Manchilui Training Institute: standard tuition fee (K6000), editable in Admin > Settings.
-- Run once in Supabase: SQL Editor > New query > paste > Run.
alter table public.app_settings
  add column if not exists tuition_fee numeric(10,2) not null default 6000 check (tuition_fee >= 0);
update public.app_settings set tuition_fee = 6000 where id;
