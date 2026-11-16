-- Manchilui Training Institute: graduation clearance and graduation fee (K800).
-- Management ticks students who have paid; students see their clearance and can print a receipt.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

begin;

alter table public.app_settings
  add column if not exists graduation_fee numeric(10,2) not null default 800 check (graduation_fee >= 0);

alter table public.students
  add column if not exists graduation_paid_on date,
  add column if not exists graduation_amount numeric(10,2);

-- Students can't read app_settings, so expose just the fee.
create or replace function public.graduation_fee()
returns numeric language sql stable security definer set search_path = public as $$
  select graduation_fee from public.app_settings where id;
$$;
grant execute on function public.graduation_fee() to authenticated;

commit;
