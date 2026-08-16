-- Allow marketplace users to view each other's public profile fields on community posts
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);
