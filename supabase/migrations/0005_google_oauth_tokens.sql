-- Stores the Google OAuth refresh token used to write receipt files into the
-- user's own Google Drive (drive.file scope). Owner-scoped RLS since this is
-- credential-adjacent data, tighter than the project's usual "any authenticated user" policy.

create table google_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  refresh_token text not null,
  scope text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table google_oauth_tokens enable row level security;

create policy "owner read/write" on google_oauth_tokens for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
