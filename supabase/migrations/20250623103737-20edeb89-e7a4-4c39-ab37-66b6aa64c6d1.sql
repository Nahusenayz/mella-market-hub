
-- Add foreign key constraint between ads.user_id and profiles.id
ALTER TABLE public.ads 
ADD CONSTRAINT fk_ads_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_ads_user_id ON public.ads(user_id);
