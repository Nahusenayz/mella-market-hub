-- Worker locations table for tracking responder positions
create table if not exists public.worker_locations (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  location_lat double precision not null,
  location_lng double precision not null,
  is_available boolean default true,
  last_updated timestamptz default now(),
  created_at timestamptz default now(),
  unique(worker_id)
);

-- Enable RLS
alter table public.worker_locations enable row level security;

-- Policies: workers can insert/update their own location
create policy if not exists "workers_insert_own_location"
  on public.worker_locations for insert
  to authenticated
  with check (auth.uid() = worker_id);

create policy if not exists "workers_update_own_location"
  on public.worker_locations for update
  to authenticated
  using (auth.uid() = worker_id);

-- Policies: anyone authenticated can select available workers
create policy if not exists "select_available_workers"
  on public.worker_locations for select
  to authenticated
  using (true);

-- Enable realtime
alter publication supabase_realtime add table public.worker_locations;
