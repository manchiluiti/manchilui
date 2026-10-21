-- Manchilui Training Institute: private messages and payment corrections
-- Run once in Supabase: SQL Editor > New query > paste > Run.

begin;

-- =========================================================
-- 1. Messages from administration
--    audience 'student'       -> one student
--    audience 'staff'         -> one staff member
--    audience 'all_lecturers' -> every lecturer
-- =========================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete set null default auth.uid(),
  audience text not null check (audience in ('student', 'staff', 'all_lecturers')),
  student_id uuid references public.students(id) on delete cascade,
  staff_id uuid references public.staff(user_id) on delete cascade,
  subject text not null check (length(subject) between 1 and 140),
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  check ((audience = 'student') = (student_id is not null)),
  check ((audience = 'staff') = (staff_id is not null))
);

create index if not exists messages_student_idx on public.messages (student_id, created_at desc);
create index if not exists messages_staff_idx on public.messages (staff_id, created_at desc);
create index if not exists messages_created_idx on public.messages (created_at desc);

create table if not exists public.message_reads (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.messages enable row level security;
alter table public.message_reads enable row level security;

drop policy if exists "read own messages" on public.messages;
drop policy if exists "management send messages" on public.messages;
drop policy if exists "management delete messages" on public.messages;

create policy "read own messages" on public.messages for select using (
  public.is_management()
  or (audience = 'student' and exists (select 1 from public.students s where s.id = student_id and s.user_id = auth.uid()))
  or (audience = 'staff' and staff_id = auth.uid())
  or (audience = 'all_lecturers' and public.is_lecturer())
);
create policy "management send messages" on public.messages for insert
  with check (public.is_management() and sender_id = auth.uid());
create policy "management delete messages" on public.messages for delete
  using (public.is_management());

drop policy if exists "see read receipts" on public.message_reads;
drop policy if exists "mark own messages read" on public.message_reads;

create policy "see read receipts" on public.message_reads for select
  using (user_id = auth.uid() or public.is_management());
-- You can only mark a message read if you are allowed to see it.
create policy "mark own messages read" on public.message_reads for insert
  with check (user_id = auth.uid() and exists (select 1 from public.messages m where m.id = message_id));

-- =========================================================
-- 2. Payment corrections that keep the balance right
-- =========================================================
create or replace function public.update_payment(
  p_id uuid, p_amount numeric, p_method text, p_reference text, p_paid_on date
) returns numeric
language plpgsql security definer set search_path = public as $$
declare old_amount numeric; sid uuid; new_balance numeric;
begin
  if not public.is_management() then
    raise exception 'Only management can change payments';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;
  select amount, student_id into old_amount, sid from public.payments where id = p_id for update;
  if sid is null then
    raise exception 'Payment not found';
  end if;
  update public.payments
     set amount = p_amount, method = p_method, reference = nullif(trim(p_reference), ''), paid_on = coalesce(p_paid_on, paid_on)
   where id = p_id;
  update public.student_accounts
     set fees_balance = fees_balance + old_amount - p_amount, updated_at = now()
   where student_id = sid
   returning fees_balance into new_balance;
  return new_balance;
end $$;

create or replace function public.delete_payment(p_id uuid) returns numeric
language plpgsql security definer set search_path = public as $$
declare old_amount numeric; sid uuid; new_balance numeric;
begin
  if not public.is_management() then
    raise exception 'Only management can remove payments';
  end if;
  select amount, student_id into old_amount, sid from public.payments where id = p_id for update;
  if sid is null then
    raise exception 'Payment not found';
  end if;
  delete from public.payments where id = p_id;
  update public.student_accounts
     set fees_balance = fees_balance + old_amount, updated_at = now()
   where student_id = sid
   returning fees_balance into new_balance;
  return new_balance;
end $$;

revoke all on function public.update_payment(uuid, numeric, text, text, date) from public, anon;
revoke all on function public.delete_payment(uuid) from public, anon;
grant execute on function public.update_payment(uuid, numeric, text, text, date) to authenticated;
grant execute on function public.delete_payment(uuid) to authenticated;

commit;
