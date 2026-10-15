# Manchilui Training Institute

Website and student portal for Manchilui Training Institute, Eastrise, Chipata.
Next.js (App Router) + Supabase + Vercel.

## Setup

1. **Supabase**: create a project, then open SQL Editor and run `supabase/migrations/0001_init.sql`.
2. **Auth settings**: Authentication > Sign In / Providers > Email: turn off "Allow new users to sign up" and "Confirm email" (staff create every account).
3. **Env vars**: copy `.env.example` to `.env.local` locally, and add the same two values in Vercel > Project > Settings > Environment Variables.
4. **Vercel**: import this repo. No other config needed.

## Adding a student

1. Table Editor > `students` > Insert row: `student_no` (e.g. `MTI-2026-014`), `full_name`, `session`, `fees_balance`. The seven modules are added automatically.
2. Authentication > Users > Add user: email `mti-2026-014@students.manchilui.com`, a password, tick "Auto Confirm User". The account links to the student row automatically.
3. Give the student their ID and password. They sign in at `/portal` with the ID, not the email.

## Adding staff

Create the staff member's auth user, then insert a row in `staff` with their `user_id`. Staff can read enquiries and manage all records (admin panel to come).

## Updating results and fees

Edit `student_modules` (status, grade) and `students` (fees_balance, remark, status) in the Table Editor. Announcements go in `announcements`: `public` shows on the homepage, `students` only in the portal.
