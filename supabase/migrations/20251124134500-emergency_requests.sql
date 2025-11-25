-- Emergency requests table for responder (Uber-like) workflow
create table if not exists public.emergency_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  responder_id uuid null references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','en_route','completed','cancelled')),
  category text null,
  details text null,
  user_location_lat double precision null,
  user_location_lng double precision null,
  responder_location_lat double precision null,
  responder_location_lng double precision null,
  created_at timestamptz not null default now(),
  updated_at timestamptz null
);

-- Updated at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_emergency_requests_updated_at on public.emergency_requests;
create trigger set_emergency_requests_updated_at
before update on public.emergency_requests
for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.emergency_requests enable row level security;

-- Policies: allow insert by authenticated users (requesters)
create policy if not exists "insert_own_emergency_request"
  on public.emergency_requests for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policies: allow select for responders and owners
create policy if not exists "select_visible_requests"
  on public.emergency_requests for select
  to authenticated
  using (
    -- owners can see
    user_id = auth.uid() or
    -- responders can see pending or where they are assigned
    status in ('pending','accepted','en_route') or
    responder_id = auth.uid()
  );

-- Policies: allow update by assigned responder or owner (owner cannot assign responder)
create policy if not exists "update_by_assigned_responder_or_owner"
  on public.emergency_requests for update
  to authenticated
  using (
    responder_id = auth.uid() or user_id = auth.uid()
  )
  with check (
    -- owner cannot set responder_id to someone else
    (user_id = auth.uid() and (responder_id is null or responder_id = auth.uid())) or
    -- responder can update when assigned to them
    responder_id = auth.uid()
  );

-- Realtime
alter publication supabase_realtime add table public.emergency_requests;
