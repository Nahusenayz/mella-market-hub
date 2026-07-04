-- Auto-update profiles.rating and profiles.total_ratings whenever reviews change

-- Function to recalculate a user's rating from reviews
CREATE OR REPLACE FUNCTION public.calculate_profile_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Determine which user's rating needs updating
  IF TG_OP = 'INSERT' THEN
    target_user_id := NEW.reviewee_id;
  ELSIF TG_OP = 'DELETE' THEN
    target_user_id := OLD.reviewee_id;
  ELSIF TG_OP = 'UPDATE' THEN
    target_user_id := NEW.reviewee_id;
  END IF;

  -- Update the profile with aggregated rating data
  UPDATE public.profiles
  SET
    rating = COALESCE(
      (SELECT ROUND(AVG(rating)::numeric, 1) FROM public.reviews WHERE reviewee_id = target_user_id),
      0
    ),
    total_ratings = (
      SELECT COUNT(*) FROM public.reviews WHERE reviewee_id = target_user_id
    ),
    updated_at = now()
  WHERE id = target_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_reviews_update_rating ON public.reviews;

-- Create the trigger
CREATE TRIGGER trg_reviews_update_rating
  AFTER INSERT OR DELETE OR UPDATE
  ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_profile_rating();

-- Ensure profiles table has real-time enabled for live UI updates
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Add profiles to realtime publication if not already there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- Backfill: recalculate ratings for all users with existing reviews
UPDATE public.profiles
SET
  rating = COALESCE(
    (SELECT ROUND(AVG(rating)::numeric, 1) FROM public.reviews WHERE reviewee_id = profiles.id),
    0
  ),
  total_ratings = (
    SELECT COUNT(*) FROM public.reviews WHERE reviewee_id = profiles.id
  ),
  updated_at = now()
WHERE id IN (SELECT DISTINCT reviewee_id FROM public.reviews);
