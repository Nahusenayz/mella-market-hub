import React, { useEffect, useState } from 'react';
import { runAiText } from '@/services/aiGateway';

interface AIServiceSuggestionsProps {
  category: string;
  listingTitles: string[];
}

export const AIServiceSuggestions: React.FC<AIServiceSuggestionsProps> = ({ category, listingTitles }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!category || !listingTitles.length) {
      setSuggestions([]);
      setError(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await runAiText({
          systemPrompt: 'You suggest related marketplace services. Return only valid JSON.',
          prompt: `Category: ${category}. Listings: ${listingTitles.slice(0, 10).join(', ')}. Suggest 3 similar services the user might want as a JSON array of strings. Return ONLY valid JSON.`,
          model: 'meta-llama/llama-3.1-8b-instruct',
        });
        const text = response.text || '[]';
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
        if (Array.isArray(parsed)) setSuggestions(parsed.slice(0, 3));
        if (!Array.isArray(parsed)) {
          setSuggestions([]);
          setError('Suggestions are temporarily unavailable.');
        }
      } catch {
        setSuggestions([]);
        setError('Suggestions are temporarily unavailable.');
      } finally {
        setLoading(false);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [category, listingTitles]);

  if (!loading && !error && !suggestions.length) return null;
  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 mb-4 border border-indigo-100 dark:border-indigo-800">
      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">🤖 You might also like</p>
      {loading ? (
        <p className="text-sm text-indigo-700/80 dark:text-indigo-300">Finding related services...</p>
      ) : error ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s, i) => (
            <span key={i} className="text-sm bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 shadow-sm border border-indigo-100 dark:border-gray-700">{s}</span>
          ))}
        </div>
      )}
    </div>
  );
};
