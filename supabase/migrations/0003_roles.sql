-- Manchilui Training Institute: management vs lecturer roles, marks, notes, classes
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Everyone already in the staff table becomes Management.

begin;

-- =========================================================
-- 1. Roles
-- =========================================================
alter table public.staff
  add column if not exists is_management boolean not null default false,
  add column if not exists is_lecturer boolean not null default false,
  add column if not exists email text;

update public.staff s set is_management = true, email = u.email
  from auth.users u where u.id = s.user_id;

create or replace function public.is_management()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid() and is_management);
$$;

create or replace function public.is_lecturer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid() and is_lecturer);
$$;

create or replace function public.is_student()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.students where user_id = auth.uid());
$$;

create table if not exists public.module_lecturers (
  module_code text not null references public.modules(code) on delete cascade,
  lecturer_id uuid not null references public.staff(user_id) on delete cascade,
  primary key (module_code, lecturer_id)
);

create or replace function public.teaches(p_module text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.module_lecturers ml
    join public.staff s on s.user_id = ml.lecturer_id
    where ml.module_code = p_module and ml.lecturer_id = auth.uid() and s.is_lecturer
  );
$$;

-- =========================================================
-- 2. Private student data (fees, phone, remark): management + the student only
-- =========================================================
create table if not exists public.student_accounts (
  student_id uuid primary key references public.students(id) on delete cascade,
  fees_balance numeric(10,2) not null default 0,
  phone text,
  remark text,
  updated_at timestamptz not null default now()
);

insert into public.student_accounts (student_id, fees_balance, phone, remark)
select id, fees_balance, phone, remark from public.students
on conflict (student_id) do nothing;

alter table public.students
  drop column if exists fees_balance,
  drop column if exists phone,
  drop column if exists remark;

create or replace function public.add_student_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.student_accounts (student_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists students_add_account on public.students;
create trigger students_add_account
after insert on public.students
for each row execute function public.add_student_account();

create or replace function public.record_payment(
  p_student uuid, p_amount numeric, p_method text, p_reference text, p_paid_on date
) returns numeric
language plpgsql security definer set search_path = public as $$
declare new_balance numeric;
begin
  if not public.is_management() then
    raise exception 'Only management can record payments';
  end if;
  insert into public.payments (student_id, amount, method, reference, paid_on, recorded_by)
  values (p_student, p_amount, p_method, nullif(trim(p_reference), ''), coalesce(p_paid_on, current_date), auth.uid());
  update public.student_accounts
     set fees_balance = fees_balance - p_amount, updated_at = now()
   where student_id = p_student
   returning fees_balance into new_balance;
  if new_balance is null then
    raise exception 'Student not found';
  end if;
  return new_balance;
end $$;

-- =========================================================
-- 3. Marks: CA and exam out of 100, final = CA 40% + Exam 60%
-- =========================================================
alter table public.student_modules
  drop column if exists grade,
  add column if not exists ca_mark numeric(5,2) check (ca_mark between 0 and 100),
  add column if not exists exam_mark numeric(5,2) check (exam_mark between 0 and 100),
  add column if not exists marks_updated_by uuid references auth.users(id) on delete set null,
  add column if not exists marks_updated_at timestamptz;

alter table public.student_modules
  add column if not exists final_mark numeric(5,1)
  generated always as (
    case when ca_mark is not null and exam_mark is not null
      then round(ca_mark * 0.4 + exam_mark * 0.6, 1) end
  ) stored;

-- Record who last changed marks, and when.
create or replace function public.stamp_marks()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.ca_mark is distinct from old.ca_mark or new.exam_mark is distinct from old.exam_mark then
    new.marks_updated_by := auth.uid();
    new.marks_updated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists student_modules_stamp on public.student_modules;
create trigger student_modules_stamp
before update on public.student_modules
for each row execute function public.stamp_marks();

-- =========================================================
-- 4. Class announcements
-- =========================================================
alter table public.announcements
  add column if not exists module_code text references public.modules(code) on delete cascade,
  add column if not exists posted_by uuid references auth.users(id) on delete set null default auth.uid();

alter table public.announcements drop constraint if exists announcements_audience_check;
alter table public.announcements add constraint announcements_audience_check
  check (audience in ('public', 'students', 'module') and (audience <> 'module' or module_code is not null));

-- =========================================================
-- 5. Notes and classes
-- =========================================================
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  module_code text not null references public.modules(code) on delete cascade,
  title text not null check (length(title) between 2 and 140),
  file_path text not null unique,
  file_name text not null,
  file_size bigint,
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  module_code text not null references public.modules(code) on delete cascade,
  title text not null check (length(title) between 2 and 140),
  starts_at timestamptz not null,
  duration_min int not null default 60 check (duration_min between 15 and 480),
  meeting_url text check (meeting_url is null or meeting_url ~ '^https://'),
  details text check (length(details) <= 1000),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists classes_starts_idx on public.classes (starts_at);
create index if not exists notes_module_idx on public.notes (module_code, created_at desc);

-- =========================================================
-- 6. Row level security (replaces the earlier staff-wide policies)
-- =========================================================
alter table public.module_lecturers enable row level security;
alter table public.student_accounts enable row level security;
alter table public.notes enable row level security;
alter table public.classes enable row level security;

-- staff
drop policy if exists "staff read staff" on public.staff;
create policy "staff read staff" on public.staff for select using (public.is_staff());
create policy "management manage staff" on public.staff for all using (public.is_management()) with check (public.is_management());

-- modules
drop policy if exists "staff manage modules" on public.modules;
create policy "management manage modules" on public.modules for all using (public.is_management()) with check (public.is_management());

-- module_lecturers
create policy "staff read assignments" on public.module_lecturers for select using (public.is_staff());
create policy "management manage assignments" on public.module_lecturers for all using (public.is_management()) with check (public.is_management());

-- students (names and IDs only now; lecturers need them for class lists)
drop policy if exists "student reads own record" on public.students;
drop policy if exists "staff manage students" on public.students;
create policy "read students" on public.students for select using (user_id = auth.uid() or public.is_staff());
create policy "management manage students" on public.students for all using (public.is_management()) with check (public.is_management());

-- student_accounts (sensitive)
create policy "read own or management" on public.student_accounts for select using (
  public.is_management() or exists (select 1 from public.students s where s.id = student_id and s.user_id = auth.uid())
);
create policy "management manage accounts" on public.student_accounts for all using (public.is_management()) with check (public.is_management());

-- payments (sensitive)
drop policy if exists "student reads own payments" on public.payments;
drop policy if exists "staff manage payments" on public.payments;
create policy "read own payments or management" on public.payments for select using (
  public.is_management() or exists (select 1 from public.students s where s.id = student_id and s.user_id = auth.uid())
);
create policy "management manage payments" on public.payments for all using (public.is_management()) with check (public.is_management());

-- student_modules (marks)
drop policy if exists "student reads own modules" on public.student_modules;
drop policy if exists "staff manage student modules" on public.student_modules;
create policy "read marks" on public.student_modules for select using (
  public.is_management() or public.teaches(module_code)
  or exists (select 1 from public.students s where s.id = student_id and s.user_id = auth.uid())
);
create policy "lecturers update own module marks" on public.student_modules for update
  using (public.is_management() or public.teaches(module_code))
  with check (public.is_management() or public.teaches(module_code));
create policy "management manage marks" on public.student_modules for all using (public.is_management()) with check (public.is_management());

-- announcements
drop policy if exists "staff manage announcements" on public.announcements;
create policy "post announcements" on public.announcements for insert with check (
  public.is_management() or (audience = 'module' and public.teaches(module_code))
);
create policy "edit own announcements" on public.announcements for update
  using (public.is_management() or posted_by = auth.uid())
  with check (public.is_management() or (audience = 'module' and public.teaches(module_code)));
create policy "delete own announcements" on public.announcements for delete
  using (public.is_management() or posted_by = auth.uid());

-- enquiries (management only)
drop policy if exists "staff read enquiries" on public.enquiries;
drop policy if exists "staff update enquiries" on public.enquiries;
create policy "management read enquiries" on public.enquiries for select using (public.is_management());
create policy "management update enquiries" on public.enquiries for update using (public.is_management()) with check (public.is_management());

-- notes
create policy "read notes" on public.notes for select using (public.is_staff() or public.is_student());
create policy "add notes" on public.notes for insert with check (public.is_management() or public.teaches(module_code));
create policy "delete notes" on public.notes for delete using (public.is_management() or uploaded_by = auth.uid());

-- classes
create policy "read classes" on public.classes for select using (public.is_staff() or public.is_student());
create policy "manage classes" on public.classes for all
  using (public.is_management() or public.teaches(module_code))
  with check (public.is_management() or public.teaches(module_code));

-- =========================================================
-- 7. File storage for notes (private bucket, files stored as <module_code>/<file>)
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('notes', 'notes', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = 26214400;

drop policy if exists "notes files read" on storage.objects;
drop policy if exists "notes files upload" on storage.objects;
drop policy if exists "notes files delete" on storage.objects;

create policy "notes files read" on storage.objects for select to authenticated
  using (bucket_id = 'notes' and (public.is_staff() or public.is_student()));
create policy "notes files upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'notes' and (public.is_management() or public.teaches((storage.foldername(name))[1])));
create policy "notes files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'notes' and (
    public.is_management()
    or exists (select 1 from public.notes n where n.file_path = name and n.uploaded_by = auth.uid())
  ));

commit;
