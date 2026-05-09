create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birth_date text not null,
  birth_time text,
  birth_location text not null,
  elements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  profile_name text,
  entry_type text not null,
  input text not null,
  response text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reflection_entries (
  id uuid primary key default gen_random_uuid(),
  profile_name text,
  questions jsonb not null default '[]'::jsonb,
  answers jsonb not null default '[]'::jsonb,
  summary text not null,
  created_at timestamptz not null default now()
);
