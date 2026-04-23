
-- Add property-specific columns to ads table
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS property_type TEXT; -- 'House', 'Room', 'Apartment', 'Commercial'
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS listing_type TEXT; -- 'Rent', 'Sale'
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS bedrooms INTEGER;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS bathrooms INTEGER;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS area_sqm DECIMAL(10,2);
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS is_furnished BOOLEAN DEFAULT false;

-- Add a property_status column to track if it is available
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS property_status TEXT DEFAULT 'available'; 

-- Add indexes for better filtering
CREATE INDEX IF NOT EXISTS ads_category_idx ON public.ads (category);
CREATE INDEX IF NOT EXISTS ads_listing_type_idx ON public.ads (listing_type);
