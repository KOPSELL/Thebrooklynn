create table if not exists public.perfis_barbeiros (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null unique references public.barbers(id) on delete cascade,
  onesignal_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists perfis_barbeiros_barber_id_idx
  on public.perfis_barbeiros(barber_id);

alter table public.perfis_barbeiros enable row level security;

drop policy if exists "Public can register barber push subscription" on public.perfis_barbeiros;
create policy "Public can register barber push subscription"
  on public.perfis_barbeiros
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public can update barber push subscription" on public.perfis_barbeiros;
create policy "Public can update barber push subscription"
  on public.perfis_barbeiros
  for update
  to anon, authenticated
  using (true)
  with check (true);

create or replace function public.set_perfis_barbeiros_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_perfis_barbeiros_updated_at on public.perfis_barbeiros;
create trigger set_perfis_barbeiros_updated_at
before update on public.perfis_barbeiros
for each row execute function public.set_perfis_barbeiros_updated_at();
