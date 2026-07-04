import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { translateWithMella } from '@/services/groqService';

const translationCache = new Map<string, string>();

export const useTranslatedText = (text: string | null | undefined): string => {
  const { language } = useLanguage();
  const [translated, setTranslated] = useState<string>(text || '');
  const isAmharic = language === 'am';
  const fetchingRef = useRef(false);

  useEffect(() => {
    const original = text || '';
    setTranslated(original);

    if (!isAmharic || !original) return;

    // Check in-memory cache
    if (translationCache.has(original)) {
      setTranslated(translationCache.get(original)!);
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;

    // Check DB cache
    (async () => {
      try {
        const { data } = await supabase
          .from('content_translations')
          .select('target_text')
          .eq('source_text', original)
          .single();

        if (data) {
          translationCache.set(original, data.target_text);
          setTranslated(data.target_text);
          fetchingRef.current = false;
          return;
        }

        // Translate live via Mella
        const result = await translateWithMella(original, 'am');
        if (result && result !== original) {
          translationCache.set(original, result);
          setTranslated(result);
          // Store in DB for future use
          supabase.from('content_translations').insert({
            source_text: original,
            target_text: result,
            target_language: 'am',
          }).then(() => {}).catch(() => {});
        }
      } catch {
        // Fallback to original text
      }
      fetchingRef.current = false;
    })();
  }, [text, isAmharic]);

  return translated;
};
