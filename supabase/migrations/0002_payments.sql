-- Manchilui Training Institute: fee payments
-- Run once in Supabase: SQL Editor > New query > paste > Run.

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  method text not null default 'Cash' check (method in ('Cash', 'Mobile money', 'Bank')),
  reference text check (length(reference) <= 80),
  paid_on date not null default current_date,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index payments_student_idx on public.payments (student_id, paid_on desc);

alter table public.payments enable row level security;

create policy "student reads own payments" on public.payments for select using (
  public.is_staff() or exists (
    select 1 from public.students s where s.id = student_id and s.user_id = auth.uid()
  )
);
create policy "staff manage payments" on public.payments for all
  using (public.is_staff()) with check (public.is_staff());

-- Records a payment and lowers the balance in one step, so the two never drift apart.
create or replace function public.record_payment(
  p_student uuid, p_amount numeric, p_method text, p_reference text, p_paid_on date
) returns numeric
language plpgsql security definer set search_path = public as $$
declare new_balance numeric;
begin
  if not public.is_staff() then
    raise exception 'Only staff can record payments';
  end if;
  insert into public.payments (student_id, amount, method, reference, paid_on, recorded_by)
  values (p_student, p_amount, p_method, nullif(trim(p_reference), ''), coalesce(p_paid_on, current_date), auth.uid());
  update public.students set fees_balance = fees_balance - p_amount
   where id = p_student
   returning fees_balance into new_balance;
  if new_balance is null then
    raise exception 'Student not found';
  end if;
  return new_balance;
end $$;

revoke all on function public.record_payment(uuid, numeric, text, text, date) from public, anon;
grant execute on function public.record_payment(uuid, numeric, text, text, date) to authenticated;
