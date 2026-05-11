create table if not exists public.otp_codes (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  code_hash   text        not null,
  expires_at  timestamptz not null,
  used        boolean     default false,
  created_at  timestamptz default now()
);

-- Tylko service role ma dostęp (edge functions używają service role key)
alter table public.otp_codes enable row level security;
create policy "Brak bezpośredniego dostępu" on public.otp_codes for all using (false);

-- Indeks dla szybkiego lookup
create index if not exists otp_codes_user_id_idx on public.otp_codes(user_id);
