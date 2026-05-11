
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
          .eq('worker_id', userId)
          .eq('payment_status', 'completed');

        // Fetch completed emergency requests
        const { data: emergencyData, error: emergencyError } = await supabase
          .from('emergency_requests' as any)
          .select('*')
          .eq('responder_id', userId)
          .eq('status', 'completed');

        if (error) throw error;
        if (emergencyError) throw emergencyError;

        // Use estimated_price from emergency requests
        const parsedEmergencyJobs = (emergencyData || []).map(r => ({
          total_amount: Number(r.estimated_price) || 0,
          created_at: r.created_at,
          title: `Emergency ${r.category?.replace('_', ' ')}`
        }));

        const allJobs = [
          ...data.map(job => ({
            total_amount: Number(job.total_amount) || 0,
            created_at: job.created_at,
            title: (job.ads as any)?.title || 'Service'
          })),
          ...parsedEmergencyJobs
        ];

        const total = allJobs.reduce((acc, curr) => acc + curr.total_amount, 0);
        
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonth = allJobs
          .filter(job => new Date(job.created_at) >= thisMonthStart)
          .reduce((acc, curr) => acc + curr.total_amount, 0);

        const averagePerJob = allJobs.length > 0 ? total / allJobs.length : 0;

        // Group by month for chart
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyMap: Record<string, number> = {};
        
        allJobs.forEach(job => {
          const d = new Date(job.created_at);
          const m = months[d.getMonth()];
          monthlyMap[m] = (monthlyMap[m] || 0) + job.total_amount;
        });

        const monthlyData = months.map(m => ({
          month: m,
          amount: monthlyMap[m] || 0
        }));

        const recentJobs = allJobs
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map(job => ({
            date: new Date(job.created_at).toLocaleDateString(),
            title: job.title,
            amount: job.total_amount
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
