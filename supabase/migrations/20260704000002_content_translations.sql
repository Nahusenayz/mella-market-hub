-- Table to store pre-computed Amharic translations for existing DB content
CREATE TABLE IF NOT EXISTS public.content_translations (
  source_text TEXT PRIMARY KEY,
  target_text TEXT NOT NULL,
  target_language TEXT NOT NULL DEFAULT 'am',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read translations" ON public.content_translations FOR SELECT USING (true);

ALTER TABLE public.content_translations REPLICA IDENTITY FULL;
