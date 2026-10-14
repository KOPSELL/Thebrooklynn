-- Thebrooklynn: bloqueios de horários e fechamento por data
create table if not exists public.barbershop_schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null,
  block_date date not null,
  start_time time without time zone,
  end_time time without time zone,
  all_day boolean not null default false,
  reason text,
  created_at timestamptz not null default now(),
  constraint schedule_block_times_check check (
    (all_day = true and start_time is null and end_time is null)
    or
    (all_day = false and start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index if not exists idx_barbershop_schedule_blocks_shop_date
  on public.barbershop_schedule_blocks (barbershop_id, block_date);

alter table public.barbershop_schedule_blocks enable row level security;

drop policy if exists "Public can read schedule blocks" on public.barbershop_schedule_blocks;
create policy "Public can read schedule blocks"
  on public.barbershop_schedule_blocks for select to anon, authenticated
  using (true);

drop policy if exists "Public can add schedule blocks" on public.barbershop_schedule_blocks;
create policy "Public can add schedule blocks"
  on public.barbershop_schedule_blocks for insert to anon, authenticated
  with check (true);

drop policy if exists "Public can remove schedule blocks" on public.barbershop_schedule_blocks;
create policy "Public can remove schedule blocks"
  on public.barbershop_schedule_blocks for delete to anon, authenticated
  using (true);
