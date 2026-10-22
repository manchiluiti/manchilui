-- Manchilui Training Institute: accept the school's real 8-digit student IDs (e.g. 20260647).
-- The older MTI-2026-001 style stays valid.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

alter table public.students drop constraint if exists students_student_no_check;
alter table public.students add constraint students_student_no_check
  check (student_no ~ '^([0-9]{8}|MTI-[0-9]{4}-[0-9]{3})$');
