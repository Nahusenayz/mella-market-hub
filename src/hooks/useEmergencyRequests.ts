
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type EmergencyRequest = {
  id: string;
  user_id: string;
  responder_id: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'en_route' | 'completed' | 'cancelled';
  category: string | null;
  details: string | null;
  user_location_lat: number | null;
  user_location_lng: number | null;
  responder_location_lat: number | null;
  responder_location_lng: number | null;
  created_at: string;
  updated_at: string | null;
};

export const useEmergencyRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_requests' as any)
        .select('*')
        .in('status', ['pending', 'accepted', 'en_route'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as EmergencyRequest[]);
    } catch (e) {
      console.error('Error fetching emergency requests', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptRequest = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('emergency_requests' as any)
        .update({ status: 'accepted', responder_id: user.id })
        .eq('id', id)
        .is('responder_id', null)
        .eq('status', 'pending');
      if (error) throw error;
      toast({ title: 'Request accepted' });
      fetchRequests();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Failed to accept', description: e.message, variant: 'destructive' });
    }
  };

  const declineRequest = async (id: string) => {
    try {
      const { error } = await supabase
        .from('emergency_requests' as any)
        .update({ status: 'declined' })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Request declined' });
      fetchRequests();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Failed to decline', description: e.message, variant: 'destructive' });
    }
  };

  const updateStatus = async (
    id: string,
    status: EmergencyRequest['status'],
    location?: { lat: number; lng: number }
  ) => {
    try {
      const update: any = { status };
      if (location) {
        update.responder_location_lat = location.lat;
        update.responder_location_lng = location.lng;
      }
      const { error } = await supabase
        .from('emergency_requests' as any)
        .update(update)
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Status updated' });
      fetchRequests();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Failed to update status', description: e.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchRequests();
    const channel = supabase
      .channel('emergency-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_requests' as any },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  return { requests, loading, acceptRequest, declineRequest, updateStatus, refetch: fetchRequests };
};
