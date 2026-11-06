-- Manchilui Training Institute: create an intake before its students are entered,
-- so lecturers can be allocated to it in advance (e.g. "August 2026 intake").
-- Run once in Supabase: SQL Editor > New query > paste > Run.

begin;

create table if not exists public.intakes (
  name text primary key check (length(trim(name)) between 3 and 60),
  created_at timestamptz not null default now()
);
alter table public.intakes enable row level security;
drop policy if exists "staff read intakes" on public.intakes;
drop policy if exists "management manage intakes" on public.intakes;
create policy "staff read intakes" on public.intakes for select using (public.is_staff());
create policy "management manage intakes" on public.intakes for all using (public.is_management()) with check (public.is_management());

-- Renaming an intake renames its entry here too (extends the 0015 trigger function).
create or replace function public.rename_session_everywhere()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.session is distinct from old.session
     and not exists (select 1 from public.students where session = old.session and id <> new.id) then
    update public.module_lecturers set session = new.session where session = old.session;
    update public.notes set session = new.session where session = old.session;
    update public.classes set session = new.session where session = old.session;
    update public.announcements set session = new.session where session = old.session;
    delete from public.intakes where name = old.session;
  end if;
  return new;
end $$;

commit;
