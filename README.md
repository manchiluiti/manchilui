# Manchilui Training Institute

Website and student portal for Manchilui Training Institute, Eastrise, Chipata.
Next.js (App Router) + Supabase + Vercel.

## Setup

1. **Supabase**: create a project, then open SQL Editor and run `supabase/migrations/0001_init.sql`.
2. **Auth settings**: Authentication > Sign In / Providers > Email: turn off "Allow new users to sign up" and "Confirm email" (staff create every account).
3. **Env vars**: copy `.env.example` to `.env.local` locally, and add the same two values in Vercel > Project > Settings > Environment Variables.
4. **Vercel**: import this repo. No other config needed.

## Admin panel and roles

Staff sign in at `/admin` (small "Staff" link in the site footer). Each staff member has one or both roles, enforced by database row level security, not just hidden on screen:

- **Management**: students, fees, payments, enrolment numbers, enquiries, staff and roles, all modules, can change any mark.
- **Lecturer**: only the modules assigned to them. Class list (names and student IDs only), CA and exam marks, notes uploads, class schedule with Meet/Zoom links, messages to their class. No fees, payments, phone numbers or enquiries.

Final mark = CA 40% + Exam 60% (calculated by the database). Students see marks as soon as they are saved; every change records who made it and when.

One-time setup, in order:
1. Run `supabase/migrations/0002_payments.sql`, `0003_roles.sql` and `0004_grades.sql`, in that order, in the SQL Editor. Existing staff become Management.
2. In Vercel, set `SUPABASE_SERVICE_ROLE_KEY` (Supabase > Project Settings > API > service_role). Server-only; used to create and reset logins.
3. First manager only: create the login in Supabase (Authentication > Users > Add user, Auto Confirm), then run
   `insert into staff (user_id, full_name, is_management) select id, 'Full Name', true from auth.users where email = 'their@email.com';`
   After that, add all other staff from **Admin > Staff**.

## Day-to-day

- **Students**: Admin > Students > + Add student creates the record and portal login. Students sign in at `/portal` with their ID (e.g. `MTI-2026-001`).
- **Fees**: record payments on the student's page; the balance updates automatically.
- **Lecturers**: Admin > Teaching > open a module to enter marks, upload notes, schedule classes and message the class.
- **Grades**: letter grades come from the grading scale (default A+ 86, A 76, B+ 68, B 62, C+ 56, C 50 pass, D+ 40, D 0). Management can change it at Admin > Teaching > Grading scale.
