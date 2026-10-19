-- Manchilui Training Institute: letter grades
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Management can change the cut-offs later in Admin > Teaching > Grading scale.

create table if not exists public.grade_scale (
  letter text primary key check (length(letter) between 1 and 3),
  min_mark numeric(5,2) not null unique check (min_mark between 0 and 100),
  remark text not null check (length(remark) <= 40),
  is_pass boolean not null
);

-- Manchilui scale. Re-running this file resets the scale to these values.
delete from public.grade_scale;
insert into public.grade_scale (letter, min_mark, remark, is_pass) values
  ('A+', 90, 'Distinction', true),
  ('A',  80, 'Excellent', true),
  ('B+', 70, 'Very good', true),
  ('B',  60, 'Good', true),
  ('C+', 50, 'Satisfactory', true),
  ('C',  40, 'Pass', true),
  ('F',   0, 'Fail', false);

alter table public.grade_scale enable row level security;
drop policy if exists "anyone reads grade scale" on public.grade_scale;
drop policy if exists "management manage grade scale" on public.grade_scale;
create policy "anyone reads grade scale" on public.grade_scale for select using (true);
create policy "management manage grade scale" on public.grade_scale for all
  using (public.is_management()) with check (public.is_management());

-- Same rule in the database, for reports and exports.
create or replace function public.letter_grade(p_mark numeric)
returns text language sql stable set search_path = public as $$
  select letter from public.grade_scale where p_mark >= min_mark order by min_mark desc limit 1;
$$;
