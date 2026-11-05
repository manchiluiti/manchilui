-- Manchilui Training Institute: store files in the institute's Google Drive.
-- Files are uploaded to Supabase first, then moved to Google Drive:
--   * lecture notes straight after upload,
--   * applicants' documents when they are registered as students.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

begin;

-- The Google connection. No policies: only the server (service role) can read the token.
create table if not exists public.drive_account (
  id int primary key default 1 check (id = 1),
  email text,
  refresh_token text not null,
  root_id text,
  students_id text,
  notes_id text,
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz not null default now()
);
alter table public.drive_account enable row level security;

-- Management can see whether Drive is connected (but never the token).
create or replace function public.drive_status()
returns table (email text, connected_at timestamptz)
language sql stable security definer set search_path = public as $$
  select email, connected_at from public.drive_account where public.is_management();
$$;
grant execute on function public.drive_status() to authenticated;

alter table public.notes add column if not exists drive_id text;
alter table public.notes add column if not exists mime_type text;
alter table public.students add column if not exists drive_folder_id text;
alter table public.applications add column if not exists files_moved_at timestamptz;

commit;
