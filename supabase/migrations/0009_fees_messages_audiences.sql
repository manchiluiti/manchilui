-- Manchilui Training Institute: amount paid before the system, announcement audiences,
-- lecturer comments to students, and messages by SMS.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

begin;

-- =========================================================
-- 1. Money paid before payments were recorded in the system
--    Paid = paid_before + sum(payments). Total fees = paid + balance.
-- =========================================================
alter table public.student_accounts
  add column if not exists paid_before numeric(10,2) not null default 0 check (paid_before >= 0);

-- =========================================================
-- 2. Announcement audiences
--    public          website + students + staff
--    website         website only
--    students        students only (portal)
--    staff           staff only (admin)
--    staff_students  staff and students (not the website)
--    module          one class (posted by its lecturer)
-- =========================================================
alter table public.announcements drop constraint if exists announcements_audience_check;
alter table public.announcements add constraint announcements_audience_check
  check (audience in ('public', 'website', 'students', 'staff', 'staff_students', 'module')
         and (audience <> 'module' or module_code is not null));

drop policy if exists "public reads public announcements" on public.announcements;
drop policy if exists "read announcements" on public.announcements;
create policy "read announcements" on public.announcements for select using (
  audience in ('public', 'website')
  or public.is_management()
  or (public.is_staff() and audience in ('staff', 'staff_students', 'students', 'module'))
  or (public.is_student() and audience in ('students', 'staff_students', 'module'))
);

-- =========================================================
-- 3. Messages: sender name shown to students, performance comments from lecturers
-- =========================================================
alter table public.messages
  add column if not exists sender_name text check (length(sender_name) <= 120),
  add column if not exists category text not null default 'message' check (category in ('message', 'performance')),
  add column if not exists module_code text references public.modules(code) on delete set null;

drop policy if exists "read own messages" on public.messages;
drop policy if exists "management send messages" on public.messages;
drop policy if exists "staff send messages" on public.messages;
drop policy if exists "management delete messages" on public.messages;
drop policy if exists "delete messages" on public.messages;

create policy "read own messages" on public.messages for select using (
  public.is_management()
  or sender_id = auth.uid()
  or (audience = 'student' and exists (select 1 from public.students s where s.id = student_id and s.user_id = auth.uid()))
  or (audience = 'staff' and staff_id = auth.uid())
  or (audience = 'all_lecturers' and public.is_lecturer())
);
-- Management can message anyone; lecturers can message individual students only.
create policy "staff send messages" on public.messages for insert with check (
  sender_id = auth.uid()
  and (public.is_management() or (public.is_lecturer() and audience = 'student'))
);
create policy "delete messages" on public.messages for delete
  using (public.is_management() or sender_id = auth.uid());

-- =========================================================
-- 4. SMS log: allow messages sent by SMS
-- =========================================================
alter table public.sms_log drop constraint if exists sms_log_kind_check;
alter table public.sms_log add constraint sms_log_kind_check
  check (kind in ('balance_reminder', 'monthly_reminder', 'salary_paid', 'test', 'message'));
alter table public.sms_log add column if not exists message_id uuid references public.messages(id) on delete set null;

commit;
