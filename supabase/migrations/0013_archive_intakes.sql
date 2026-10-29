-- Manchilui Training Institute: archive finished intakes.
-- Archived students drop off the everyday lists (students, teaching, fees, messages)
-- but nothing is deleted: results, payments and logins stay, and they can still
-- sign in to view their results and fees (read-only). Owing archived students can
-- still be sent balance reminders.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

begin;

alter table public.students add column if not exists archived_at timestamptz;
create index if not exists students_archived_idx on public.students (archived_at);
create index if not exists students_session_idx on public.students (session);

-- Lecturers can't change marks for archived students (management still can).
create or replace function public.block_archived_marks()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_management()
     and exists (select 1 from public.students s where s.id = new.student_id and s.archived_at is not null)
     and (new.ca_mark is distinct from old.ca_mark or new.exam_mark is distinct from old.exam_mark) then
    raise exception 'This student''s intake is archived. Ask management to change archived marks.';
  end if;
  return new;
end $$;

drop trigger if exists student_modules_block_archived on public.student_modules;
create trigger student_modules_block_archived
before update on public.student_modules
for each row execute function public.block_archived_marks();

commit;
