
-- Add user_type column to profiles table
ALTER TABLE public.profiles ADD COLUMN user_type text DEFAULT 'user';

-- Create a check constraint to ensure valid user types
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check 
CHECK (user_type IN ('user', 'worker'));
