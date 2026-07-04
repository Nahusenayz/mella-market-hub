-- Migration: Create reviews table if it doesn't exist
-- Run this in Supabase SQL Editor if reviews table is missing

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reviews') THEN
    CREATE TABLE reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reviewer_id UUID NOT NULL REFERENCES profiles(id),
      reviewee_id UUID NOT NULL REFERENCES profiles(id),
      booking_id UUID REFERENCES bookings(id),
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title TEXT,
      comment TEXT,
      helpful_count INTEGER DEFAULT 0,
      response TEXT,
      response_date TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      UNIQUE(reviewer_id, booking_id)
    );

    ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
    CREATE POLICY "Users can create reviews" ON reviews FOR INSERT 
      WITH CHECK (auth.uid() = reviewer_id);
    CREATE POLICY "Users can update their own reviews" ON reviews FOR UPDATE 
      USING (auth.uid() = reviewer_id);

    ALTER TABLE reviews REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE reviews;

    RAISE NOTICE '✅ reviews table created successfully';
  ELSE
    RAISE NOTICE 'ℹ️ reviews table already exists';
  END IF;
END $$;
