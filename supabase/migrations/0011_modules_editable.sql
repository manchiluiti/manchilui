-- Manchilui Training Institute: editable modules (rename, change code, add, remove).
-- Run once in Supabase: SQL Editor > New query > paste > Run.

begin;

-- 1. When a module code changes, carry it through to marks, lecturer assignments,
--    notes, classes, class announcements and messages.
do $$
declare r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl, a.attname as col, c.confdeltype
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f' and c.confrelid = 'public.modules'::regclass
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format(
      'alter table %s add constraint %I foreign key (%I) references public.modules(code) on update cascade %s',
      r.tbl, r.conname, r.col,
      case r.confdeltype when 'c' then 'on delete cascade' when 'n' then 'on delete set null' else '' end
    );
  end loop;
end $$;

-- 2. A new module is added to every existing student (status set automatically).
create or replace function public.add_module_to_students()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.student_modules (student_id, module_code)
  select s.id, new.code from public.students s
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists modules_add_to_students on public.modules;
create trigger modules_add_to_students
after insert on public.modules
for each row execute function public.add_module_to_students();

-- 3. Module codes: capital letters, digits and dashes.
alter table public.modules drop constraint if exists modules_code_check;
alter table public.modules add constraint modules_code_check check (code ~ '^[A-Z0-9-]{2,12}$');
alter table public.modules drop constraint if exists modules_name_check;
alter table public.modules add constraint modules_name_check check (length(trim(name)) between 2 and 120);

-- 4. Log module changes in the activity log.
drop trigger if exists audit_modules on public.modules;
create trigger audit_modules after insert or update or delete on public.modules
for each row execute function public.audit_trigger();

commit;
