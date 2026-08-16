import React, { useEffect, useState } from 'react';
import { runAiText } from '@/services/aiGateway';

interface ReviewSummaryProps {
  reviews: { rating: number; comment?: string }[];
}

export const ReviewSummary: React.FC<ReviewSummaryProps> = ({ reviews }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!reviews.length || summary) return;
    const comments = reviews.filter(r => r.comment).map(r => r.comment).slice(0, 20);
    if (!comments.length) return;
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await runAiText({
          systemPrompt: 'Summarize reviews in one short sentence.',
          prompt: `Summarize these reviews in 1 sentence:\n${comments.join('\n')}`,
          model: 'meta-llama/llama-3.1-8b-instruct',
        });
        setSummary(response.text || null);
      } catch {
        setSummary(null);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [reviews, summary]);

  if (!loading && !summary && !error) return null;
  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-3 mb-3 border border-purple-100 dark:border-purple-800">
      <div className="flex items-start gap-2">
        <span className="text-sm mt-0.5">🤖</span>
        <div>
          <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">AI Summary</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
            {loading ? 'Summarizing reviews...' : summary || 'Summary unavailable right now.'}
          </p>
        </div>
      </div>
    </div>
  );
};
