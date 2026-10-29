-- Manchilui Training Institute: module status is set automatically.
-- In progress = the student is registered for the module (no final result yet).
-- Completed   = both CA and exam marks are in.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

begin;

create or replace function public.student_modules_auto_status()
returns trigger language plpgsql set search_path = public as $$
begin
  new.status := case when new.ca_mark is not null and new.exam_mark is not null then 'Completed' else 'In progress' end;
  return new;
end $$;

drop trigger if exists student_modules_auto_status on public.student_modules;
create trigger student_modules_auto_status
before insert or update on public.student_modules
for each row execute function public.student_modules_auto_status();

alter table public.student_modules alter column status set default 'In progress';

-- Bring every existing row in line (fires the trigger above).
update public.student_modules set status = status;

commit;
