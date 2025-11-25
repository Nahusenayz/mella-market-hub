
-- Enable real-time for existing tables
ALTER TABLE public.ads REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Add the tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.ads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Create messages table for user communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for messages
CREATE POLICY "Users can view their own messages" 
  ON public.messages 
  FOR SELECT 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages" 
  ON public.messages 
  FOR UPDATE 
  USING (auth.uid() = receiver_id);

-- Enable real-time for messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create conversations view for easier querying
CREATE VIEW public.conversations AS
SELECT DISTINCT
  CASE 
    WHEN sender_id < receiver_id THEN sender_id
    ELSE receiver_id
  END as user1_id,
  CASE 
    WHEN sender_id < receiver_id THEN receiver_id
    ELSE sender_id
  END as user2_id,
  (SELECT content FROM public.messages m2 
   WHERE (m2.sender_id = m1.sender_id AND m2.receiver_id = m1.receiver_id) 
      OR (m2.sender_id = m1.receiver_id AND m2.receiver_id = m1.sender_id)
   ORDER BY created_at DESC LIMIT 1) as last_message,
  (SELECT created_at FROM public.messages m2 
   WHERE (m2.sender_id = m1.sender_id AND m2.receiver_id = m1.receiver_id) 
      OR (m2.sender_id = m1.receiver_id AND m2.receiver_id = m1.sender_id)
   ORDER BY created_at DESC LIMIT 1) as last_message_at
FROM public.messages m1;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Anyone can view active ads" ON public.ads;
DROP POLICY IF EXISTS "Users can insert their own ads" ON public.ads;
DROP POLICY IF EXISTS "Users can update their own ads" ON public.ads;
DROP POLICY IF EXISTS "Users can delete their own ads" ON public.ads;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create RLS policies for ads to make them public
CREATE POLICY "Anyone can view active ads" 
  ON public.ads 
  FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Users can insert their own ads" 
  ON public.ads 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ads" 
  ON public.ads 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ads" 
  ON public.ads 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for profiles to make them public for viewing
CREATE POLICY "Anyone can view profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);
