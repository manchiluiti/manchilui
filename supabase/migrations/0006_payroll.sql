-- Manchilui Training Institute: staff payroll
-- Run once in Supabase: SQL Editor > New query > paste > Run.

begin;

-- Salary settings per staff member (management + the staff member themselves can read)
create table if not exists public.staff_pay (
  user_id uuid primary key references public.staff(user_id) on delete cascade,
  basic_salary numeric(12,2) not null default 0 check (basic_salary >= 0),
  pay_method text not null default 'Bank' check (pay_method in ('Bank', 'Mobile money', 'Cash')),
  pay_to text check (length(pay_to) <= 120),  -- e.g. "Zanaco ****4521" or "Airtel 097 *** 997"
  updated_at timestamptz not null default now()
);

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  period date not null unique check (extract(day from period) = 1),  -- first day of the month
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.payslips (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.payroll_runs(id) on delete cascade,
  staff_id uuid not null references public.staff(user_id) on delete cascade,
  period date not null,
  basic numeric(12,2) not null default 0 check (basic >= 0),
  allowances numeric(12,2) not null default 0 check (allowances >= 0),
  deductions numeric(12,2) not null default 0 check (deductions >= 0),
  net_pay numeric(12,2) generated always as (basic + allowances - deductions) stored,
  note text check (length(note) <= 200),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  method text check (method in ('Bank', 'Mobile money', 'Cash')),
  reference text check (length(reference) <= 80),
  paid_at timestamptz,
  paid_by uuid references auth.users(id) on delete set null,
  unique (run_id, staff_id),
  check (basic + allowances - deductions >= 0)
);

create index if not exists payslips_staff_idx on public.payslips (staff_id, period desc);

-- Paid payslips are locked: amounts can only change after marking them unpaid again.
create or replace function public.lock_paid_payslip()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.status = 'paid' and new.status = 'paid' and (
       new.basic is distinct from old.basic or new.allowances is distinct from old.allowances
       or new.deductions is distinct from old.deductions) then
    raise exception 'This payslip is already paid. Mark it unpaid before changing amounts.';
  end if;
  if new.status = 'paid' and old.status <> 'paid' then
    new.paid_at := coalesce(new.paid_at, now());
    new.paid_by := auth.uid();
  elsif new.status = 'pending' then
    new.paid_at := null;
    new.paid_by := null;
  end if;
  return new;
end $$;

drop trigger if exists payslips_lock on public.payslips;
create trigger payslips_lock before update on public.payslips
for each row execute function public.lock_paid_payslip();

-- Start a month's payroll: one payslip per active staff member, basic salary filled in.
create or replace function public.start_payroll(p_period date)
returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid; p date := date_trunc('month', p_period)::date;
begin
  if not public.is_management() then
    raise exception 'Only management can run payroll';
  end if;
  insert into public.payroll_runs (period) values (p) returning id into rid;
  insert into public.payslips (run_id, staff_id, period, basic, method)
  select rid, s.user_id, p, coalesce(sp.basic_salary, 0), coalesce(sp.pay_method, 'Bank')
    from public.staff s
    left join public.staff_pay sp on sp.user_id = s.user_id
   where s.is_management or s.is_lecturer;
  return rid;
exception when unique_violation then
  raise exception 'Payroll for % has already been started', to_char(p, 'FMMonth YYYY');
end $$;

revoke all on function public.start_payroll(date) from public, anon;
grant execute on function public.start_payroll(date) to authenticated;

-- Row level security
alter table public.staff_pay enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payslips enable row level security;

drop policy if exists "read own pay settings" on public.staff_pay;
drop policy if exists "management manage pay settings" on public.staff_pay;
create policy "read own pay settings" on public.staff_pay for select using (user_id = auth.uid() or public.is_management());
create policy "management manage pay settings" on public.staff_pay for all using (public.is_management()) with check (public.is_management());

drop policy if exists "management manage runs" on public.payroll_runs;
create policy "management manage runs" on public.payroll_runs for all using (public.is_management()) with check (public.is_management());

drop policy if exists "read own paid payslips" on public.payslips;
drop policy if exists "management manage payslips" on public.payslips;
-- Staff only see their payslip once it has been paid.
create policy "read own paid payslips" on public.payslips for select
  using (public.is_management() or (staff_id = auth.uid() and status = 'paid'));
create policy "management manage payslips" on public.payslips for all
  using (public.is_management()) with check (public.is_management());

commit;
