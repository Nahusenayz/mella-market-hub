import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  attachEmergencyProfiles,
  extractEstimatedPrice,
  sendEmergencyMessage,
  updateEmergencyStatus,
} from '@/shared/emergencyRequestService';

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
  estimated_price?: number | null;
  user_profile?: {
    full_name: string | null;
    phone_number: string | null;
    profile_image_url: string | null;
  };
};

export type NewRequestHandler = (request: EmergencyRequest) => void;

export const useEmergencyRequests = (onNewRequest?: NewRequestHandler) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const knownIds = useRef(new Set<string>());

  const fetchRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_requests')
        .select('*')
        .in('status', ['pending', 'accepted', 'en_route'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const fetched = (data || []) as EmergencyRequest[];
      const withProfiles = await attachEmergencyProfiles(fetched);

      setRequests((prev) => {
        const prevIds = new Set(prev.map((r) => r.id));
        const firstKnown = knownIds.current.size === 0;

        for (const r of withProfiles) {
          if (!knownIds.current.has(r.id)) {
            knownIds.current.add(r.id);
            if (!firstKnown && !prevIds.has(r.id) && r.status === 'pending' && onNewRequest) {
              onNewRequest(r);
            }
          }
        }

        return withProfiles as EmergencyRequest[];
      });
    } catch (e) {
      console.error('Error fetching emergency requests', e);
    } finally {
      setLoading(false);
    }
  }, [onNewRequest]);

  const acceptRequest = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('emergency_requests')
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
        .from('emergency_requests')
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
      await updateEmergencyStatus(id, status, location);
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
        { event: 'INSERT', schema: 'public', table: 'emergency_requests' },
        (payload) => {
          const newReq = payload.new as EmergencyRequest;
          if (newReq.status === 'pending' && onNewRequest) {
            knownIds.current.add(newReq.id);
            onNewRequest({
              ...newReq,
              estimated_price: extractEstimatedPrice(newReq.details),
            });
          }
          fetchRequests();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_requests' },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests, onNewRequest]);

  return { requests, loading, acceptRequest, declineRequest, updateStatus, refetch: fetchRequests };
};
