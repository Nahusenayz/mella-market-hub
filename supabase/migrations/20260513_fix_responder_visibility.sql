-- Fix Responder Visibility and Public Access
-- Created: 2026-05-13

-- 1. Update worker_locations policies to allow anonymous and authenticated selection
DROP POLICY IF EXISTS "select_available_workers" ON public.worker_locations;
CREATE POLICY "select_available_workers_v2" 
  ON public.worker_locations FOR SELECT 
  TO anon, authenticated
  USING (is_available = true);

-- 2. Update profiles policies to allow anonymous and authenticated selection of public worker info
-- This allows users to see responder names, images, and phone numbers even if not logged in or not an admin
DROP POLICY IF EXISTS "Public worker profile access" ON public.profiles;
CREATE POLICY "Public worker profile access_v2"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (
    (user_type = 'worker') OR 
    (auth.uid() = id) OR 
    (public.is_admin())
  );

-- 3. Ensure all relevant tables are in the realtime publication
-- IMPORTANT: SET TABLE replaces the entire list, so we must include everything
ALTER PUBLICATION supabase_realtime SET TABLE 
  public.profiles, 
  public.ads, 
  public.bookings, 
  public.emergency_requests,
  public.worker_locations;
