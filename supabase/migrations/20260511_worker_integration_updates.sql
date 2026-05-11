-- Worker Integration & Phone Support Updates
-- Created: 2026-05-11

-- 1. Update worker_locations to include service_fee
ALTER TABLE public.worker_locations 
ADD COLUMN IF NOT EXISTS service_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ETB';

-- 2. Update emergency_requests to include estimated_price
ALTER TABLE public.emergency_requests 
ADD COLUMN IF NOT EXISTS estimated_price NUMERIC DEFAULT 0;

-- 3. Enhance handle_new_user to be robust for Phone and Email signups
-- This trigger automatically populates the profiles table when a new user signs up via Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_phone TEXT;
BEGIN
  -- Prototype hack: If email ends in @mella.temp, extract phone number
  IF NEW.email LIKE '%@mella.temp' THEN
    extracted_phone := split_part(NEW.email, '@', 1);
  ELSE
    extracted_phone := NEW.phone;
  END IF;

  INSERT INTO public.profiles (
    id, 
    email, 
    phone_number,
    full_name, 
    user_type
  )
  VALUES (
    NEW.id,
    CASE WHEN NEW.email LIKE '%@mella.temp' THEN NULL ELSE NEW.email END,
    extracted_phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'app_role', 'user')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone_number = EXCLUDED.phone_number,
    full_name = EXCLUDED.full_name,
    user_type = EXCLUDED.user_type,
    updated_at = now();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

