
-- Drop existing functions first to allow parameter name changes
DROP FUNCTION IF EXISTS delete_ad_safely(UUID);
DROP FUNCTION IF EXISTS delete_profile_safely(UUID);

-- Function to delete an ad safely (bypasses URL filters for 'ads' and handles cascade)
CREATE OR REPLACE FUNCTION delete_ad_safely(p_ad_id UUID)
RETURNS void AS $$
BEGIN
  -- 1. Delete payment transactions related to bookings of this ad
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_transactions') THEN
    DELETE FROM payment_transactions WHERE booking_id IN (SELECT id FROM bookings WHERE ad_id = p_ad_id);
  END IF;
  
  -- 2. Delete reviews related to bookings of this ad
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reviews') THEN
    DELETE FROM reviews WHERE booking_id IN (SELECT id FROM bookings WHERE ad_id = p_ad_id);
  END IF;
  
  -- 3. Delete bookings related to this ad
  DELETE FROM bookings WHERE ad_id = p_ad_id;
  
  -- 4. Finally delete the ad
  DELETE FROM ads WHERE id = p_ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a profile safely
CREATE OR REPLACE FUNCTION delete_profile_safely(p_profile_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete all ads owned by this user (this will cascade using the function above)
  DECLARE
    ad_record RECORD;
  BEGIN
    FOR ad_record IN (SELECT id FROM ads WHERE user_id = p_profile_id) LOOP
      PERFORM delete_ad_safely(ad_record.id);
    END LOOP;
  END;

  -- Delete direct records from optional/dependent tables
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'emergency_requests') THEN
    DELETE FROM emergency_requests WHERE user_id = p_profile_id OR responder_id = p_profile_id;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'worker_locations') THEN
    DELETE FROM worker_locations WHERE user_id = p_profile_id;
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_transactions') THEN
    DELETE FROM payment_transactions WHERE user_id = p_profile_id;
  END IF;
  
  -- Finally delete the profile
  DELETE FROM profiles WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
