# Manchilui Training Institute

Website and student portal for Manchilui Training Institute, Eastrise, Chipata.
Next.js (App Router) + Supabase + Vercel.

## Setup

1. **Supabase**: create a project, then open SQL Editor and run `supabase/migrations/0001_init.sql`.
2. **Auth settings**: Authentication > Sign In / Providers > Email: turn off "Allow new users to sign up" and "Confirm email" (staff create every account).
3. **Env vars**: copy `.env.example` to `.env.local` locally, and add the same two values in Vercel > Project > Settings > Environment Variables.
4. **Vercel**: import this repo. No other config needed.

## Admin panel

Staff manage everything at `/admin` (there is also a small "Staff" link in the site footer).

One-time setup:
1. Run `supabase/migrations/0002_payments.sql` in the SQL Editor.
2. In Vercel, add `SUPABASE_SERVICE_ROLE_KEY` (Supabase > Project Settings > API > service_role). It stays on the server and is only used to create and reset student logins. Never put it in code or share it.
3. Create the staff login: Supabase > Authentication > Users > Add user (real email, a password, Auto Confirm). Then run:
   `insert into staff (user_id, full_name) select id, 'Full Name' from auth.users where email = 'their@email.com';`

What staff can do:
- **Students**: add a student (creates the portal login too), search, edit details and status, set remarks.
- **Payments**: record a payment; the balance drops automatically and the student sees it in the portal.
- **Modules**: set each module to Not started / In progress / Completed, with a grade.
- **Logins**: change a student's password, or create a login for an older record.
- **Announcements**: post to everyone (website + portal) or students only; delete old ones.
- **Enquiries**: see Admissions form submissions, call or WhatsApp in one tap, mark handled.

