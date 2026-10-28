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
1. Run `supabase/migrations/0002_payments.sql`, `0003_roles.sql`, `0004_grades.sql`, `0005_messages.sql`, `0006_payroll.sql`, `0007_operations.sql`, `0008_student_ids.sql` and `0009_fees_messages_audiences.sql`, in that order, in the SQL Editor. Existing staff become Management.
2. In Vercel, set `SUPABASE_SERVICE_ROLE_KEY` (Supabase > Project Settings > API > service_role). Server-only; used to create and reset logins.
3. First manager only: create the login in Supabase (Authentication > Users > Add user, Auto Confirm), then run
   `insert into staff (user_id, full_name, is_management) select id, 'Full Name', true from auth.users where email = 'their@email.com';`
   After that, add all other staff from **Admin > Staff**.

## Day-to-day

- **Students**: Admin > Students > + Add student creates the record and portal login. Students sign in at `/portal` with their ID (e.g. `MTI-2026-001`).
- **Fees**: record payments on the student's page; the balance updates automatically.
- **Lecturers**: Admin > Teaching > open a module to enter marks, upload notes, schedule classes and message the class.
- **Grades**: A+ 90, A 80, B+ 70, B 60, C+ 50, C 40 (pass mark), F below 40. Management can change it at Admin > Teaching > Grading scale.
- **Payment corrections**: on a student's page, open Edit on any payment to change it or remove it; the balance adjusts automatically.
- **Messages**: Admin > Messages sends a private message to one student, one staff member, or all lecturers, with read receipts. Students read them in the portal; lecturers in Admin > Inbox. For a notice to every student, use Announcements > Students only.
- **Payroll**: Admin > Payroll. Set each staff member's basic salary once, then each month click Start payroll, adjust allowances/deductions, and mark payslips paid (individually with a reference, or all at once). Staff see paid payslips under My pay and can print them. Paid payslips are locked; mark unpaid to correct one.
- **Receipts**: each payment on a student's page has a Receipt link (printable, numbered MTI-R00001…). Issued by the office only.
- **Online applications**: the Admissions page form saves applications with documents. Admin > Applications: review, accept (fees + start date), print the acceptance letter, then Register to create the student and login.
- **SMS (Africa's Talking)**: only three kinds. (a) Balance reminder button for owing students (one per student per 24 h), (b) automatic text when a salary is marked paid, (c) monthly reminder to owing students on the reminder day, only inside the fee calendar. Switch on and configure in Admin > Settings.
- **Statutory deductions**: NAPSA, NHIMA and PAYE rates in Admin > Settings (0% for now).
- **Statement of results**: built but frozen; turn on in Admin > Settings.
- **Activity**: Admin > Activity lists every change to fees, payments, marks, payroll, staff and settings. It can't be edited.

### Environment variables (Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `AT_USERNAME`, `AT_API_KEY` (Africa's Talking), optional `AT_SENDER_ID` (registered sender name)
- `CRON_SECRET` (any long random string; Vercel uses it to call the daily job in `vercel.json`, which also keeps the free Supabase project awake)
- **Student logins**: by default a student's first password is their student ID; on first sign-in they must set their own (8+ characters, letters and numbers, not their ID). Students change it any time from the portal; staff from Admin > My account. "Reset password" with a blank box resets a student to their ID.
- **Bulk import**: Admin > Students > Import from spreadsheet. CSV with columns Student ID, Full name, Session, Phone (optional), Fees balance (optional). Preview shows problems before anything is saved.
- **Fees totals**: Admin > Students > Edit fees (all students) to set amount paid so far and balance for everyone on one screen; or Edit amount paid and balance on a student's page. Imports accept an optional Amount paid column.
- **Messages by SMS**: Admin > Messages has Send (portal) and Send + SMS.
- **Lecturer comments**: on each module page, lecturers send performance comments or messages to individual students; management sees all of them in Messages and on each student's page.
- **Announcement audiences**: Everyone, Website only, Students only, Staff only, Staff and students.
