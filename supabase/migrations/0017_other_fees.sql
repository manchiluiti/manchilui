-- Manchilui Training Institute: fees besides tuition (computer, uniform, registration, ID)
-- and registration requirements (folder, ream of paper, 2 books).
-- Every student starts fully paid / all items brought; the office then edits balances.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

begin;

create table if not exists public.fee_items (
  code text primary key check (code ~ '^[a-z0-9_]{2,30}$'),
  name text not null check (length(trim(name)) between 2 and 60),
  kind text not null check (kind in ('fee', 'item')),   -- fee = money, item = something the student brings
  amount numeric(10,2) check (amount is null or amount >= 0),
  sort int not null default 0
);

create table if not exists public.student_fee_items (
  student_id uuid not null references public.students(id) on delete cascade,
  item_code text not null references public.fee_items(code) on delete cascade on update cascade,
  balance numeric(10,2) not null default 0 check (balance >= 0),   -- fees: amount still owed
  provided boolean not null default true,                          -- items: brought or not
  updated_at timestamptz not null default now(),
  primary key (student_id, item_code)
);

alter table public.fee_items enable row level security;
alter table public.student_fee_items enable row level security;
drop policy if exists "read fee items" on public.fee_items;
drop policy if exists "management fee items" on public.fee_items;
create policy "read fee items" on public.fee_items for select using (auth.uid() is not null);
create policy "management fee items" on public.fee_items for all using (public.is_management()) with check (public.is_management());
drop policy if exists "read own fee items" on public.student_fee_items;
drop policy if exists "management student fee items" on public.student_fee_items;
create policy "read own fee items" on public.student_fee_items for select using (
  public.is_management() or exists (select 1 from public.students s where s.id = student_id and s.user_id = auth.uid())
);
create policy "management student fee items" on public.student_fee_items for all using (public.is_management()) with check (public.is_management());

insert into public.fee_items (code, name, kind, amount, sort) values
  ('computer', 'Computer fee', 'fee', 700, 1),
  ('uniform', 'Uniform', 'fee', 200, 2),
  ('registration', 'Registration', 'fee', 100, 3),
  ('id_card', 'I.D.', 'fee', 50, 4),
  ('folder', 'A folder', 'item', null, 11),
  ('ream', 'Ream of paper', 'item', null, 12),
  ('books', '2 books', 'item', null, 13)
on conflict (code) do nothing;

-- Everyone fully paid / all items brought to start with.
insert into public.student_fee_items (student_id, item_code)
select s.id, f.code from public.students s cross join public.fee_items f
on conflict do nothing;

-- New students and new fee items get rows automatically (fully paid / brought).
create or replace function public.add_fee_items_for_student()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.student_fee_items (student_id, item_code) select new.id, code from public.fee_items on conflict do nothing;
  return new;
end $$;
drop trigger if exists students_add_fee_items on public.students;
create trigger students_add_fee_items after insert on public.students for each row execute function public.add_fee_items_for_student();

create or replace function public.add_fee_item_to_students()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.student_fee_items (student_id, item_code) select id, new.code from public.students on conflict do nothing;
  return new;
end $$;
drop trigger if exists fee_items_add_to_students on public.fee_items;
create trigger fee_items_add_to_students after insert on public.fee_items for each row execute function public.add_fee_item_to_students();

-- Total of other-fee balances kept on the account, so lists, reminders and the dashboard can add it to tuition.
alter table public.student_accounts add column if not exists other_balance numeric(10,2) not null default 0;

create or replace function public.refresh_other_balance()
returns trigger language plpgsql security definer set search_path = public as $$
declare sid uuid := coalesce(new.student_id, old.student_id);
begin
  insert into public.student_accounts (student_id, other_balance)
  values (sid, coalesce((select sum(sfi.balance) from public.student_fee_items sfi join public.fee_items f on f.code = sfi.item_code where sfi.student_id = sid and f.kind = 'fee'), 0))
  on conflict (student_id) do update set other_balance = excluded.other_balance;
  return null;
end $$;
drop trigger if exists student_fee_items_balance on public.student_fee_items;
create trigger student_fee_items_balance after insert or update or delete on public.student_fee_items
for each row execute function public.refresh_other_balance();

drop trigger if exists audit_student_fee_items on public.student_fee_items;
create trigger audit_student_fee_items after update on public.student_fee_items for each row execute function public.audit_trigger();
drop trigger if exists audit_fee_items on public.fee_items;
create trigger audit_fee_items after insert or update or delete on public.fee_items for each row execute function public.audit_trigger();

commit;
