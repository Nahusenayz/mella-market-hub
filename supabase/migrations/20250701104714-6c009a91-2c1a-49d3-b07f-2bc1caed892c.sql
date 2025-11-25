
-- Add typing indicators and read receipts to messages
ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text';
ALTER TABLE messages ADD COLUMN reply_to_message_id UUID REFERENCES messages(id);

-- Create typing indicators table
CREATE TABLE typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id),
  is_typing BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on typing indicators
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Policy for typing indicators
CREATE POLICY "Users can manage typing indicators in their conversations"
ON typing_indicators FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM messages m 
    WHERE (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
    AND (conversation_id = CONCAT(LEAST(m.sender_id::text, m.receiver_id::text), '_', GREATEST(m.sender_id::text, m.receiver_id::text)))
  )
);

-- Add verification badges to profiles
ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN verification_type TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN badges JSONB DEFAULT '[]'::jsonb;

-- Create reviews table for advanced rating system
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

-- Enable RLS on reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policies for reviews
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT 
WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can update their own reviews" ON reviews FOR UPDATE 
USING (auth.uid() = reviewer_id);

-- Create social feed table
CREATE TABLE feed_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  activity_type TEXT NOT NULL,
  content JSONB NOT NULL,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on feed activities
ALTER TABLE feed_activities ENABLE ROW LEVEL SECURITY;

-- Policy for feed activities
CREATE POLICY "Users can view public feed activities" ON feed_activities 
FOR SELECT USING (visibility = 'public' OR user_id = auth.uid());
CREATE POLICY "Users can create their own activities" ON feed_activities 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create user follows table
CREATE TABLE user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id),
  following_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS on follows
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Policies for follows
CREATE POLICY "Users can view follows" ON user_follows FOR SELECT USING (true);
CREATE POLICY "Users can manage their follows" ON user_follows FOR ALL 
USING (auth.uid() = follower_id);

-- Add tracking fields to bookings for Uber-like experience
ALTER TABLE bookings ADD COLUMN provider_location_lat NUMERIC;
ALTER TABLE bookings ADD COLUMN provider_location_lng NUMERIC;
ALTER TABLE bookings ADD COLUMN eta_minutes INTEGER;
ALTER TABLE bookings ADD COLUMN status_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE bookings ADD COLUMN payment_method TEXT;
ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN total_amount NUMERIC;
ALTER TABLE bookings ADD COLUMN emergency_contact JSONB;

-- Create payment transactions table
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'ETB',
  payment_method TEXT NOT NULL,
  transaction_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on payment transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policy for payment transactions
CREATE POLICY "Users can view their own transactions" ON payment_transactions 
FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transactions" ON payment_transactions 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for new tables
ALTER TABLE typing_indicators REPLICA IDENTITY FULL;
ALTER TABLE reviews REPLICA IDENTITY FULL;
ALTER TABLE feed_activities REPLICA IDENTITY FULL;
ALTER TABLE user_follows REPLICA IDENTITY FULL;
ALTER TABLE payment_transactions REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE feed_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE user_follows;
ALTER PUBLICATION supabase_realtime ADD TABLE payment_transactions;
