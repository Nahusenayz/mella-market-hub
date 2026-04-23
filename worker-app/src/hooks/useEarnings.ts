
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

export interface EarningDetails {
  total: number;
  thisMonth: number;
  averagePerJob: number;
  monthlyData: { month: string; amount: number }[];
  recentJobs: { date: string; title: string; amount: number }[];
}

export const useEarnings = (userId: string | null) => {
  const [earnings, setEarnings] = useState<EarningDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchEarnings = async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            total_amount,
            service_date,
            created_at,
            ads (title)
          `)
          .eq('worker_id', userId)
          .eq('payment_status', 'completed');

        if (error) throw error;

        const total = data.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
        
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonth = data
          .filter(job => new Date(job.created_at) >= thisMonthStart)
          .reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);

        const averagePerJob = data.length > 0 ? total / data.length : 0;

        // Group by month for chart
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyMap: Record<string, number> = {};
        
        data.forEach(job => {
          const d = new Date(job.created_at);
          const m = months[d.getMonth()];
          monthlyMap[m] = (monthlyMap[m] || 0) + (Number(job.total_amount) || 0);
        });

        const monthlyData = months.map(m => ({
          month: m,
          amount: monthlyMap[m] || 0
        }));

        const recentJobs = data
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map(job => ({
            date: new Date(job.created_at).toLocaleDateString(),
            title: (job.ads as any)?.title || 'Service',
            amount: Number(job.total_amount)
          }));

        setEarnings({
          total,
          thisMonth,
          averagePerJob,
          monthlyData,
          recentJobs
        });
      } catch (err) {
        console.error('Error fetching earnings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, [userId]);

  return { earnings, loading };
};
