
-- Add ad_type column to the ads table
ALTER TABLE public.ads 
ADD COLUMN ad_type TEXT NOT NULL DEFAULT 'service';

-- Add a check constraint to ensure valid ad types
ALTER TABLE public.ads 
ADD CONSTRAINT ads_ad_type_check 
CHECK (ad_type IN ('service', 'sell', 'rent'));
