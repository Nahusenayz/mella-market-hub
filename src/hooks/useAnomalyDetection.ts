import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Anomaly {
  metric: string;
  message: string;
  severity: 'warning' | 'danger';
}

export const useAnomalyDetection = () => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  useEffect(() => {
    const check = async () => {
      try {
        const results: Anomaly[] = [];
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
        const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000).toISOString();

        const { count: thisWeek } = await supabase.from('emergency_requests' as any).select('*', { count: 'exact', head: true }).gte('created_at', weekAgo);
        const { count: lastWeek } = await supabase.from('emergency_requests' as any).select('*', { count: 'exact', head: true }).gte('created_at', twoWeeksAgo).lt('created_at', weekAgo);
        if (thisWeek && lastWeek && lastWeek > 0 && thisWeek > lastWeek * 1.5) {
          results.push({ metric: 'emergencies', message: `⚠️ Emergency requests up ${Math.round((thisWeek / lastWeek - 1) * 100)}% this week`, severity: 'warning' });
        }

        const { count: usersThis } = await supabase.from('profiles' as any).select('*', { count: 'exact', head: true }).gte('created_at', weekAgo);
        const { count: usersLast } = await supabase.from('profiles' as any).select('*', { count: 'exact', head: true }).gte('created_at', twoWeeksAgo).lt('created_at', weekAgo);
        if (usersThis && usersLast && usersLast > 0 && usersThis < usersLast * 0.5) {
          results.push({ metric: 'users', message: `📉 New user signups dropped ${Math.round((1 - usersThis / usersLast) * 100)}% this week`, severity: 'warning' });
        }

        setAnomalies(results);
      } catch { setAnomalies([]); }
    };
    check();
    const interval = setInterval(check, 300000);
    return () => clearInterval(interval);
  }, []);

  return anomalies;
};
