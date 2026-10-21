-- Manchilui Training Institute: settings, SMS, statutory deductions, receipts,
-- online applications, activity log.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

begin;

-- =========================================================
-- 1. Settings (one row) and fee calendar
-- =========================================================
create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  sms_enabled boolean not null default false,
  reminder_day int not null default 15 check (reminder_day between 1 and 28),
  napsa_rate numeric(5,2) not null default 0 check (napsa_rate between 0 and 100),
  nhima_rate numeric(5,2) not null default 0 check (nhima_rate between 0 and 100),
  paye_rate numeric(5,2) not null default 0 check (paye_rate between 0 and 100),
  results_statement_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (true) on conflict (id) do nothing;

-- Monthly fee reminders are only sent on dates inside one of these periods.
create table if not exists public.fee_calendar (
  id uuid primary key default gen_random_uuid(),
  label text not null check (length(label) between 2 and 60),
  starts_on date not null,
  ends_on date not null,
  check (ends_on >= starts_on)
);

alter table public.app_settings enable row level security;
alter table public.fee_calendar enable row level security;
drop policy if exists "staff read settings" on public.app_settings;
drop policy if exists "management update settings" on public.app_settings;
create policy "staff read settings" on public.app_settings for select using (public.is_staff());
create policy "management update settings" on public.app_settings for update using (public.is_management()) with check (public.is_management());
drop policy if exists "management manage calendar" on public.fee_calendar;
create policy "management manage calendar" on public.fee_calendar for all using (public.is_management()) with check (public.is_management());

-- =========================================================
-- 2. SMS log (also used to prevent duplicate texts)
-- =========================================================
create table if not exists public.sms_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('balance_reminder', 'monthly_reminder', 'salary_paid', 'test')),
  student_id uuid references public.students(id) on delete set null,
  staff_id uuid references public.staff(user_id) on delete set null,
  payslip_id uuid,
  period date,
  to_phone text not null,
  message text not null,
  status text not null check (status in ('sent', 'failed')),
  detail text,
  cost text,
  sent_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists sms_log_created_idx on public.sms_log (created_at desc);
create unique index if not exists sms_monthly_once on public.sms_log (student_id, period) where kind = 'monthly_reminder' and status = 'sent';
create unique index if not exists sms_salary_once on public.sms_log (payslip_id) where kind = 'salary_paid' and status = 'sent';

alter table public.sms_log enable row level security;
drop policy if exists "management sms log" on public.sms_log;
create policy "management sms log" on public.sms_log for all using (public.is_management()) with check (public.is_management());

-- Staff phone for salary texts (private: management + self, like salary)
alter table public.staff_pay add column if not exists phone text check (length(phone) <= 20);

-- =========================================================
-- 3. Receipt numbers on payments
-- =========================================================
alter table public.payments add column if not exists receipt_no bigint generated always as identity;
create unique index if not exists payments_receipt_no on public.payments (receipt_no);

-- =========================================================
-- 4. Statutory deductions on payslips (rates live in app_settings, 0% for now)
-- =========================================================
alter table public.payslips
  add column if not exists napsa numeric(12,2) not null default 0 check (napsa >= 0),
  add column if not exists nhima numeric(12,2) not null default 0 check (nhima >= 0),
  add column if not exists paye numeric(12,2) not null default 0 check (paye >= 0);

alter table public.payslips drop constraint if exists payslips_check;
alter table public.payslips drop column if exists net_pay;
alter table public.payslips add column net_pay numeric(12,2)
  generated always as (basic + allowances - deductions - napsa - nhima - paye) stored;
alter table public.payslips drop constraint if exists payslips_net_check;
alter table public.payslips add constraint payslips_net_check
  check (basic + allowances - deductions - napsa - nhima - paye >= 0);

create or replace function public.payslip_statutory()
returns trigger language plpgsql security definer set search_path = public as $$
declare s public.app_settings; gross numeric;
begin
  if new.status = 'pending' then
    select * into s from public.app_settings where id;
    gross := new.basic + new.allowances;
    new.napsa := round(gross * coalesce(s.napsa_rate, 0) / 100, 2);
    new.nhima := round(gross * coalesce(s.nhima_rate, 0) / 100, 2);
    new.paye  := round(gross * coalesce(s.paye_rate, 0) / 100, 2);
  end if;
  return new;
end $$;

drop trigger if exists payslips_statutory on public.payslips;
create trigger payslips_statutory before insert or update on public.payslips
for each row execute function public.payslip_statutory();

-- =========================================================
-- 5. Online applications
-- =========================================================
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(full_name) between 2 and 120),
  phone text not null check (length(phone) between 9 and 20),
  email text check (email is null or length(email) <= 120),
  date_of_birth date,
  town text check (length(town) <= 80),
  preferred_intake text check (length(preferred_intake) <= 40),
  grade12_year int check (grade12_year between 1970 and 2100),
  message text check (length(message) <= 1000),
  documents jsonb not null default '[]'::jsonb,
  status text not null default 'Applied' check (status in ('Applied', 'Accepted', 'Rejected', 'Registered')),
  fees_offered numeric(10,2) check (fees_offered >= 0),
  start_date date,
  decision_note text check (length(decision_note) <= 500),
  student_id uuid references public.students(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists applications_status_idx on public.applications (status, created_at desc);

alter table public.applications enable row level security;
drop policy if exists "anyone can apply" on public.applications;
drop policy if exists "management manage applications" on public.applications;
create policy "anyone can apply" on public.applications for insert to anon, authenticated with check (
  status = 'Applied' and student_id is null and fees_offered is null and reviewed_by is null
  and decision_note is null and jsonb_array_length(documents) <= 4
);
create policy "management manage applications" on public.applications for all
  using (public.is_management()) with check (public.is_management());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('applications', 'applications', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png'];

drop policy if exists "applicants upload documents" on storage.objects;
drop policy if exists "management read applications" on storage.objects;
drop policy if exists "management delete applications" on storage.objects;
create policy "applicants upload documents" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'applications' and name ~ '^[0-9a-f-]{36}/[^/]+$');
create policy "management read applications" on storage.objects for select to authenticated
  using (bucket_id = 'applications' and public.is_management());
create policy "management delete applications" on storage.objects for delete to authenticated
  using (bucket_id = 'applications' and public.is_management());

-- =========================================================
-- 6. Activity log: who changed money, marks, staff and records, and when
-- =========================================================
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  table_name text not null,
  action text not null,
  subject jsonb not null default '{}'::jsonb,
  changes jsonb not null default '{}'::jsonb
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);

alter table public.audit_log enable row level security;
drop policy if exists "management read activity" on public.audit_log;
create policy "management read activity" on public.audit_log for select using (public.is_management());
-- No insert/update/delete policies: rows are written only by the trigger and can't be edited.

create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  r jsonb := coalesce(n, o);
  diff jsonb := '{}'::jsonb;
  k text;
  skip text[] := array['updated_at', 'marks_updated_at', 'marks_updated_by', 'paid_by', 'created_at', 'documents'];
begin
  if tg_op = 'UPDATE' then
    for k in select key from jsonb_each(n) loop
      if not (k = any(skip)) and (o -> k) is distinct from (n -> k) then
        diff := diff || jsonb_build_object(k, jsonb_build_array(o -> k, n -> k));
      end if;
    end loop;
    if diff = '{}'::jsonb then return null; end if;
  else
    diff := (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from jsonb_each(r) where not (key = any(skip)));
  end if;
  insert into public.audit_log (actor, table_name, action, subject, changes)
  values (auth.uid(), tg_table_name, tg_op, jsonb_strip_nulls(jsonb_build_object(
    'id', r ->> 'id',
    'student_id', r ->> 'student_id',
    'module_code', r ->> 'module_code',
    'staff_id', coalesce(r ->> 'staff_id', r ->> 'user_id'),
    'letter', r ->> 'letter',
    'period', r ->> 'period'
  )), diff);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['students', 'payments', 'staff', 'staff_pay', 'payslips', 'grade_scale', 'app_settings', 'applications'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function public.audit_trigger()', t);
  end loop;
  -- These get rows created automatically for every new student, so only changes are logged.
  foreach t in array array['student_accounts', 'student_modules'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after update on public.%1$I for each row execute function public.audit_trigger()', t);
  end loop;
end $$;

-- start_payroll: statutory amounts are filled in by the trigger above.
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

commit;
