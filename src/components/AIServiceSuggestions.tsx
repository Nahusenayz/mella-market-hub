import React, { useEffect, useState } from 'react';

interface AIServiceSuggestionsProps {
  category: string;
  listingTitles: string[];
}

export const AIServiceSuggestions: React.FC<AIServiceSuggestionsProps> = ({ category, listingTitles }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!category || !listingTitles.length) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Mella Market Hub',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.1-8b-instruct',
            messages: [{ role: 'user', content: `Category: ${category}. Listings: ${listingTitles.slice(0, 10).join(', ')}. Suggest 3 similar services the user might want as a JSON array of strings. Return ONLY valid JSON.` }]
          })
        });
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '[]';
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
        if (Array.isArray(parsed)) setSuggestions(parsed.slice(0, 3));
      } catch { setSuggestions([]); }
    }, 2000);
    return () => clearTimeout(timer);
  }, [category, listingTitles]);

  if (!suggestions.length) return null;
  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 mb-4 border border-indigo-100 dark:border-indigo-800">
      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">🤖 You might also like</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s, i) => (
          <span key={i} className="text-sm bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 shadow-sm border border-indigo-100 dark:border-gray-700">{s}</span>
        ))}
      </div>
    </div>
  );
};
