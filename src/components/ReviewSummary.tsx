import React, { useEffect, useState } from 'react';

interface ReviewSummaryProps {
  reviews: { rating: number; comment?: string }[];
}

export const ReviewSummary: React.FC<ReviewSummaryProps> = ({ reviews }) => {
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!reviews.length || summary) return;
    const comments = reviews.filter(r => r.comment).map(r => r.comment).slice(0, 20);
    if (!comments.length) return;
    const fetchSummary = async () => {
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
            messages: [{ role: 'user', content: `Summarize these reviews in 1 sentence:\n${comments.join('\n')}` }]
          })
        });
        const data = await res.json();
        setSummary(data.choices?.[0]?.message?.content || null);
      } catch { setSummary(null); }
    };
    fetchSummary();
  }, [reviews, summary]);

  if (!summary) return null;
  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-3 mb-3 border border-purple-100 dark:border-purple-800">
      <div className="flex items-start gap-2">
        <span className="text-sm mt-0.5">🤖</span>
        <div>
          <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">AI Summary</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{summary}</p>
        </div>
      </div>
    </div>
  );
};
