import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PAGE_SIZE = 10;

// ─── Dashboard Stats ───
export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      // Helper to fetch count safely
      const getCount = async (query: any) => {
        try {
          const { count, error } = await query;
          if (error) {
            console.error('Supabase query error:', error);
            return 0;
          }
          return count ?? 0;
        } catch (err) {
          console.error('Failed to fetch count:', err);
          return 0;
        }
      };

      const [totalUsers, activeWorkers, totalJobs, pendingJobs, activeEmergencies] = await Promise.all([
        getCount(supabase.from('profiles').select('id', { count: 'exact', head: true })),
        getCount(supabase.from('profiles').select('id', { count: 'exact', head: true }).not('user_type', 'eq', 'user').not('user_type', 'eq', 'admin')),
        getCount(supabase.from('ads').select('id', { count: 'exact', head: true })),
        getCount(supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
        getCount(supabase.from('emergency_requests').select('id', { count: 'exact', head: true })),
      ]);

      return {
        totalUsers,
        activeWorkers,
        totalJobs,
        pendingJobs,
        activeEmergencies,
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

export const useCreateUser = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (newUser: any) => {
      const { data, error } = await supabase.from('profiles').insert([newUser]).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'workers'] });
      toast({ title: 'User created successfully' });
    },
    onError: (err: Error) => {
      toast({ title: 'Creation failed', description: err.message, variant: 'destructive' });
    },
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

export const useDeleteUser = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      // Use RPC to bypass potential URL blockers
      const { error } = await supabase.rpc('delete_profile_safely', { p_profile_id: id });
      
      if (error) {
        console.error('RPC Delete failed:', error);
        if (error.code === 'P0001' || error.message?.includes('not found')) {
          throw new Error('Database deletion function not found. Please run the provided SQL migration in your Supabase dashboard.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({ title: 'User deleted successfully' });
    },
    onError: (err: Error) => {
      toast({ 
        title: 'Delete failed', 
        description: err.message, 
        variant: 'destructive' 
      });
    },
  });
};

// ─── Workers (All Responder Types) ───
export const useAdminWorkers = (page: number) => {
  return useQuery({
    queryKey: ['admin', 'workers', page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('profiles')
        .select('*, worker_locations:worker_locations(category)', { count: 'exact' })
        .not('user_type', 'eq', 'user')
        .not('user_type', 'eq', 'admin')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data ?? [], totalCount: count ?? 0 };
    },
    refetchInterval: 5000,
  });
};

// ─── Jobs (All User Ads/Posts) ───
export const useAdminJobs = (page: number, statusFilter: string = 'all') => {
  return useQuery({
    queryKey: ['admin', 'jobs', page, statusFilter],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('ads')
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

export const useCreateJob = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (newJob: any) => {
      const { data, error } = await supabase.from('ads').insert([newJob]).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      toast({ title: 'Post created successfully' });
    },
    onError: (err: Error) => {
      toast({ title: 'Creation failed', description: err.message, variant: 'destructive' });
    },
  });
};

export const useUpdateJob = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from('ads').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      toast({ title: 'Post updated successfully' });
    },
    onError: (err: Error) => {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    },
  });
};

export const useDeleteJob = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      // Use RPC to bypass 'ads' keyword blockers in URL
      const { error } = await supabase.rpc('delete_ad_safely', { p_ad_id: id });
      
      if (error) {
        console.error('RPC Delete failed:', error);
        // If RPC fails, it's likely because the function wasn't created yet
        if (error.code === 'P0001' || error.message?.includes('not found')) {
          throw new Error('Database deletion function not found. Please run the provided SQL migration in your Supabase dashboard.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      toast({ title: 'Post deleted successfully' });
    },
    onError: (err: Error) => {
      toast({ 
        title: 'Delete failed', 
        description: err.message, 
        variant: 'destructive' 
      });
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
    refetchInterval: 5000,
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
