-- Manchilui Training Institute: letter grades
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Management can change the cut-offs later in Admin > Teaching > Grading scale.

create table if not exists public.grade_scale (
  letter text primary key check (length(letter) between 1 and 3),
  min_mark numeric(5,2) not null unique check (min_mark between 0 and 100),
  remark text not null check (length(remark) <= 40),
  is_pass boolean not null
);

insert into public.grade_scale (letter, min_mark, remark, is_pass) values
  ('A+', 86, 'Distinction', true),
  ('A',  76, 'Distinction', true),
  ('B+', 68, 'Meritorious', true),
  ('B',  62, 'Very satisfactory', true),
  ('C+', 56, 'Definite pass', true),
  ('C',  50, 'Bare pass', true),
  ('D+', 40, 'Fail', false),
  ('D',   0, 'Fail', false)
on conflict (letter) do nothing;

alter table public.grade_scale enable row level security;
create policy "anyone reads grade scale" on public.grade_scale for select using (true);
create policy "management manage grade scale" on public.grade_scale for all
  using (public.is_management()) with check (public.is_management());

-- Same rule in the database, for reports and exports.
create or replace function public.letter_grade(p_mark numeric)
returns text language sql stable set search_path = public as $$
  select letter from public.grade_scale where p_mark >= min_mark order by min_mark desc limit 1;
$$;
