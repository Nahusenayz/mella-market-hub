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

-- 4. Add fallback_order column for request reassignment
ALTER TABLE public.emergency_requests
ADD COLUMN IF NOT EXISTS fallback_order INTEGER DEFAULT 0;

-- 5. Add declined_responder_ids array to track responders who declined
ALTER TABLE public.emergency_requests
ADD COLUMN IF NOT EXISTS declined_responder_ids UUID[] DEFAULT '{}';

-- 6. Create trigger function for declining requests
CREATE OR REPLACE FUNCTION public.handle_emergency_request_decline()
RETURNS TRIGGER AS $$
DECLARE
  next_responder_id UUID;
  request RECORD;
BEGIN
  request := NEW;
  IF NEW.status = 'declined' AND OLD.status <> 'declined' THEN
    -- Find next available responder not in declined list
    SELECT wl.worker_id INTO next_responder_id
    FROM worker_locations wl
    WHERE wl.is_available = true
      AND wl.worker_id <> request.responder_id
      AND NOT (wl.worker_id = ANY (request.declined_responder_ids))
    ORDER BY wl.created_at ASC
    LIMIT 1;

    IF next_responder_id IS NOT NULL THEN
      NEW.responder_id := next_responder_id;
      NEW.status := 'pending';
      NEW.fallback_order := COALESCE(NEW.fallback_order,0) + 1;
      NEW.declined_responder_ids := array_append(NEW.declined_responder_ids, request.responder_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Attach trigger to emergency_requests updates
CREATE TRIGGER trg_emergency_request_decline
BEFORE UPDATE ON public.emergency_requests
FOR EACH ROW
WHEN (NEW.status = 'declined')
EXECUTE FUNCTION public.handle_emergency_request_decline();
