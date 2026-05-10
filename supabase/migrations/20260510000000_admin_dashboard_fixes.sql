-- Admin Dashboard Master Schema Fixes
-- This file synchronizes the Supabase database with the Admin Dashboard requirements.

-- 1. Ensure Profiles has all necessary columns
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_type TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.0;

-- 2. Ensure Bookings has all necessary columns
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES public.profiles(id);

-- 3. Ensure Emergency Requests has all necessary columns
ALTER TABLE public.emergency_requests 
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS details TEXT,
  ADD COLUMN IF NOT EXISTS user_location_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS user_location_lng DOUBLE PRECISION;

-- 4. Create Admin Helper Function (Security Definer)
-- This avoids infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Set up RLS Policies for Admin Dashboard
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING ((auth.uid() = id) OR (public.is_admin()));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (public.is_admin());

-- 6. Ensure Realtime is enabled for all tables
-- We use a DO block to avoid errors if they are already in the publication
DO $$
BEGIN
    -- Overwrite the publication list with all necessary tables
    ALTER PUBLICATION supabase_realtime SET TABLE 
      public.profiles, 
      public.ads, 
      public.bookings, 
      public.emergency_requests;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not update publication: %', SQLERRM;
END $$;
