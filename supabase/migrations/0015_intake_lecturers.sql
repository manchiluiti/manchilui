-- Manchilui Training Institute: lecturers are assigned to a module FOR AN INTAKE.
-- e.g. CFM5 Cargo Storage: Patrick Chunga for the June 2026 intake, Mathews Phiri for January 2027.
-- A lecturer only sees and marks the students of the intakes they teach, and their
-- notes, classes and class messages go only to those intakes.
-- Existing assignments (no intake) keep working for every intake until you change them.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

begin;

-- 1. Assignments get an intake (blank = all intakes).
alter table public.module_lecturers add column if not exists session text;
alter table public.module_lecturers drop constraint if exists module_lecturers_pkey;
create unique index if not exists module_lecturers_unique on public.module_lecturers (module_code, lecturer_id, coalesce(session, ''));

-- Does the signed-in lecturer teach this module for this intake? (null intake = an "all intakes" assignment)
create or replace function public.teaches_intake(p_module text, p_session text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.module_lecturers ml
    join public.staff s on s.user_id = ml.lecturer_id
    where ml.module_code = p_module and ml.lecturer_id = auth.uid() and s.is_lecturer
      and (ml.session is null or ml.session = p_session)
  );
$$;

create or replace function public.teaches_student(p_module text, p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.teaches_intake(p_module, (select session from public.students where id = p_student));
$$;

-- The signed-in student's intake.
create or replace function public.my_session()
returns text language sql stable security definer set search_path = public as $$
  select session from public.students where user_id = auth.uid() limit 1;
$$;

grant execute on function public.teaches_intake(text, text), public.teaches_student(text, uuid), public.my_session() to authenticated;

-- 2. Marks: lecturers only for students in their intakes.
drop policy if exists "read marks" on public.student_modules;
drop policy if exists "lecturers update own module marks" on public.student_modules;
create policy "read marks" on public.student_modules for select using (
  public.is_management() or public.teaches_student(module_code, student_id)
  or exists (select 1 from public.students s where s.id = student_id and s.user_id = auth.uid())
);
create policy "lecturers update own module marks" on public.student_modules for update
  using (public.is_management() or public.teaches_student(module_code, student_id))
  with check (public.is_management() or public.teaches_student(module_code, student_id));

-- 3. Notes, classes and class messages belong to an intake (blank = every intake).
alter table public.notes add column if not exists session text;
alter table public.classes add column if not exists session text;
alter table public.announcements add column if not exists session text;

drop policy if exists "read notes" on public.notes;
drop policy if exists "add notes" on public.notes;
create policy "read notes" on public.notes for select using (
  public.is_staff() or (public.is_student() and (session is null or session = public.my_session()))
);
create policy "add notes" on public.notes for insert with check (
  public.is_management() or public.teaches_intake(module_code, session)
);

drop policy if exists "read classes" on public.classes;
drop policy if exists "manage classes" on public.classes;
create policy "read classes" on public.classes for select using (
  public.is_staff() or (public.is_student() and (session is null or session = public.my_session()))
);
create policy "manage classes" on public.classes for all
  using (public.is_management() or public.teaches_intake(module_code, session))
  with check (public.is_management() or public.teaches_intake(module_code, session));

drop policy if exists "read announcements" on public.announcements;
create policy "read announcements" on public.announcements for select using (
  audience in ('public', 'website')
  or public.is_management()
  or (public.is_staff() and audience in ('staff', 'staff_students', 'students', 'module'))
  or (public.is_student() and (audience in ('students', 'staff_students')
      or (audience = 'module' and (session is null or session = public.my_session()))))
);
drop policy if exists "post announcements" on public.announcements;
create policy "post announcements" on public.announcements for insert with check (
  public.is_management() or (audience = 'module' and public.teaches_intake(module_code, session))
);
drop policy if exists "edit own announcements" on public.announcements;
create policy "edit own announcements" on public.announcements for update
  using (public.is_management() or posted_by = auth.uid())
  with check (public.is_management() or (audience = 'module' and public.teaches_intake(module_code, session)));

-- 4. Renaming an intake (Intakes page) carries assignments, notes, classes and messages along.
create or replace function public.rename_session_everywhere()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.session is distinct from old.session
     and not exists (select 1 from public.students where session = old.session and id <> new.id) then
    update public.module_lecturers set session = new.session where session = old.session;
    update public.notes set session = new.session where session = old.session;
    update public.classes set session = new.session where session = old.session;
    update public.announcements set session = new.session where session = old.session;
  end if;
  return new;
end $$;
drop trigger if exists students_rename_session on public.students;
create trigger students_rename_session after update of session on public.students
for each row execute function public.rename_session_everywhere();

drop trigger if exists audit_module_lecturers on public.module_lecturers;
create trigger audit_module_lecturers after insert or update or delete on public.module_lecturers
for each row execute function public.audit_trigger();

commit;
