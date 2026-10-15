-- Manchilui Training Institute: initial schema
-- Run once in Supabase: SQL Editor > New query > paste > Run.

-- ---------- staff ----------
create table public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

-- ---------- programme modules ----------
create table public.modules (
  code text primary key,
  name text not null,
  sort int not null
);

insert into public.modules (code, name, sort) values
  ('CF101', 'Communication Skills', 1),
  ('CF102', 'Shipping Practice', 2),
  ('CF103', 'Health and Safety', 3),
  ('CF104', 'Customs Procedure', 4),
  ('CF105', 'Cargo Storage', 5),
  ('CF106', 'Entrepreneurship', 6),
  ('CF107', 'Clearing and Forwarding', 7);

-- ---------- students ----------
create table public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  student_no text not null unique check (student_no ~ '^MTI-[0-9]{4}-[0-9]{3}$'),
  full_name text not null,
  phone text,
  programme text not null default 'Diploma in Clearing & Forwarding',
  session text not null,
  status text not null default 'Registered'
    check (status in ('Registered', 'Pending', 'Suspended', 'Completed', 'Withdrawn')),
  fees_balance numeric(10,2) not null default 0,
  remark text,
  created_at timestamptz not null default now()
);

create table public.student_modules (
  student_id uuid not null references public.students(id) on delete cascade,
  module_code text not null references public.modules(code),
  status text not null default 'Not started'
    check (status in ('Not started', 'In progress', 'Completed')),
  grade text,
  primary key (student_id, module_code)
);

-- Every new student gets all seven modules, set to "Not started".
create or replace function public.add_student_modules()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.student_modules (student_id, module_code)
  select new.id, code from public.modules;
  return new;
end $$;

create trigger students_add_modules
after insert on public.students
for each row execute function public.add_student_modules();

-- Login accounts use <student_no>@students.manchilui.com.
-- When staff create that auth user, link it to the matching student row.
create or replace function public.link_student_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email like '%@students.manchilui.com' then
    update public.students
       set user_id = new.id
     where lower(student_no) = split_part(lower(new.email), '@', 1)
       and user_id is null;
  end if;
  return new;
end $$;

create trigger on_auth_user_created_link_student
after insert on auth.users
for each row execute function public.link_student_account();

-- ---------- announcements ----------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'public' check (audience in ('public', 'students')),
  posted_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- ---------- enquiries from the Admissions form ----------
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(full_name) between 2 and 120),
  phone text not null check (length(phone) between 9 and 20),
  preferred_intake text,
  message text check (length(message) <= 1000),
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- row level security ----------
alter table public.staff enable row level security;
alter table public.modules enable row level security;
alter table public.students enable row level security;
alter table public.student_modules enable row level security;
alter table public.announcements enable row level security;
alter table public.enquiries enable row level security;

create policy "staff read staff" on public.staff for select using (public.is_staff());

create policy "anyone reads modules" on public.modules for select using (true);
create policy "staff manage modules" on public.modules for all using (public.is_staff()) with check (public.is_staff());

create policy "student reads own record" on public.students for select using (user_id = auth.uid() or public.is_staff());
create policy "staff manage students" on public.students for all using (public.is_staff()) with check (public.is_staff());

create policy "student reads own modules" on public.student_modules for select using (
  public.is_staff() or exists (
    select 1 from public.students s where s.id = student_id and s.user_id = auth.uid()
  )
);
create policy "staff manage student modules" on public.student_modules for all using (public.is_staff()) with check (public.is_staff());

create policy "public reads public announcements" on public.announcements for select
  using (audience = 'public' or auth.uid() is not null);
create policy "staff manage announcements" on public.announcements for all using (public.is_staff()) with check (public.is_staff());

create policy "anyone can send an enquiry" on public.enquiries for insert to anon, authenticated
  with check (handled = false);
create policy "staff read enquiries" on public.enquiries for select using (public.is_staff());
create policy "staff update enquiries" on public.enquiries for update using (public.is_staff()) with check (public.is_staff());
