import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PAGE_SIZE = 10;

// ─── Dashboard Stats ───
export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const [usersRes, workersRes, jobsRes, pendingRes, emergencyRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'worker'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('emergency_requests').select('id', { count: 'exact', head: true }).neq('status', 'completed'),
      ]);
      return {
        totalUsers: usersRes.count ?? 0,
        activeWorkers: workersRes.count ?? 0,
        totalJobs: jobsRes.count ?? 0,
        pendingJobs: pendingRes.count ?? 0,
        activeEmergencies: emergencyRes.count ?? 0,
      };
    },
    refetchInterval: 5000,
  });
};

// ─── Users (profiles) ───
export const useAdminUsers = (page: number) => {
  return useQuery({
    queryKey: ['admin', 'users', page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data ?? [], totalCount: count ?? 0 };
    },
    refetchInterval: 5000,
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from('profiles').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      toast({ title: 'User updated successfully' });
    },
    onError: (err: Error) => {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    },
  });
};

// ─── Workers (profiles with user_type='worker') ───
export const useAdminWorkers = (page: number) => {
  return useQuery({
    queryKey: ['admin', 'workers', page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('user_type', 'worker')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data ?? [], totalCount: count ?? 0 };
    },
    refetchInterval: 5000,
  });
};

// ─── Jobs (bookings) ───
export const useAdminJobs = (page: number, statusFilter: string) => {
  return useQuery({
    queryKey: ['admin', 'jobs', page, statusFilter],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('bookings')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data ?? [], totalCount: count ?? 0 };
    },
    refetchInterval: 5000,
  });
};

export const useUpdateJob = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from('bookings').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      toast({ title: 'Job updated successfully' });
    },
    onError: (err: Error) => {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    },
  });
};

// ─── Payments ───
export const useAdminPayments = (page: number) => {
  return useQuery({
    queryKey: ['admin', 'payments', page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('payment_transactions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data ?? [], totalCount: count ?? 0 };
    },
    refetchInterval: 5000,
  });
};

// ─── Reports ───
export const useAdminReports = () => {
  return useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: async () => {
      const now = new Date();

      // Jobs per day (last 7 days)
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentJobs } = await supabase
        .from('bookings')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      const jobsByDay: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        jobsByDay[key] = 0;
      }
      (recentJobs ?? []).forEach((j) => {
        const key = j.created_at?.split('T')[0];
        if (key && key in jobsByDay) jobsByDay[key]++;
      });

      // New users per week (last 8 weeks)
      const eightWeeksAgo = new Date(now);
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', eightWeeksAgo.toISOString())
        .order('created_at', { ascending: true });

      const usersByWeek: Record<string, number> = {};
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        const weekLabel = `W${getWeekNumber(d)}`;
        usersByWeek[weekLabel] = 0;
      }

      (recentUsers ?? []).forEach((u) => {
        if (u.created_at) {
          const weekLabel = `W${getWeekNumber(new Date(u.created_at))}`;
          if (weekLabel in usersByWeek) usersByWeek[weekLabel]++;
        }
      });

      return {
        jobsPerDay: Object.entries(jobsByDay).map(([date, count]) => ({
          date: date.slice(5), // MM-DD
          count,
        })),
        usersPerWeek: Object.entries(usersByWeek).map(([week, count]) => ({
          week,
          count,
        })),
      };
    },
    refetchInterval: 5000,
  });
};

// ─── Emergencies ───
export const useAdminEmergencies = (page: number) => {
  return useQuery({
    queryKey: ['admin', 'emergencies', page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('emergency_requests')
        .select(`
          *,
          user_profile:profiles!user_id(full_name, phone_number),
          worker_profile:profiles!responder_id(full_name, phone_number)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data ?? [], totalCount: count ?? 0 };
    },
    refetchInterval: 5000, // Refresh every 5s for emergencies
  });
};

export const useUpdateEmergency = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from('emergency_requests').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      toast({ title: 'Emergency updated successfully' });
    },
    onError: (err: Error) => {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    },
  });
};

function getWeekNumber(d: Date): number {
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - oneJan.getTime()) / 86400000);
  return Math.ceil((days + oneJan.getDay() + 1) / 7);
}
