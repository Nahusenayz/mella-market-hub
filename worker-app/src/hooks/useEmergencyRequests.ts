import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import {
  attachEmergencyProfiles,
  extractEstimatedPrice,
  sendEmergencyMessage,
  updateEmergencyStatus,
} from '../../../src/shared/emergencyRequestService';

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

export function useEmergencyRequests() {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [history, setHistory] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userCategory, setUserCategory] = useState<string | null>(null);
  const [declinedIds, setDeclinedIds] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (user) {
        setUserId(user.id);
        setUserCategory(user.user_metadata?.category || null);
      }
    });
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const { data: activeData, error: activeError } = await supabase
        .from('emergency_requests')
        .select('*')
        .in('status', ['pending', 'accepted', 'en_route'])
        .order('created_at', { ascending: false });

      if (activeError) {
        console.error('Error fetching requests:', activeError);
      }

      let filteredData = (activeData || []) as EmergencyRequest[];
      filteredData = filteredData.filter((r) => !declinedIds.includes(r.id));

      if (userCategory) {
        filteredData = filteredData.filter((r) => {
          if (r.status === 'pending') {
            const matchesCategory = !r.category || r.category === userCategory;
            const isUnassigned = !r.responder_id;
            const isAssignedToMe = r.responder_id === userId;
            return matchesCategory && (isUnassigned || isAssignedToMe);
          }
          return r.responder_id === userId;
        });
      }

      if (filteredData.length > 0) {
        filteredData = (await attachEmergencyProfiles(filteredData)) as EmergencyRequest[];
      }

      setRequests(filteredData);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: historyData, error: historyError } = await supabase
          .from('emergency_requests')
          .select('*')
          .eq('responder_id', user.id)
          .in('status', ['completed', 'cancelled', 'declined'])
          .order('created_at', { ascending: false })
          .limit(50);

        if (historyError) console.error(historyError);
        const historyWithPrice = (historyData || []).map((r) => ({
          ...r,
          estimated_price: extractEstimatedPrice(r.details),
        }));
        setHistory(historyWithPrice as EmergencyRequest[]);
      }

      setLoading(false);
    } catch (e) {
      console.error('Error in fetchRequests:', e);
      setLoading(false);
    }
  }, [declinedIds, userCategory, userId]);

  const accept = async (id: string, responderId: string) => {
    try {
      const { data: checkData } = await supabase
        .from('emergency_requests')
        .select('status, responder_id')
        .eq('id', id)
        .single();

      if (checkData?.status !== 'pending' || (checkData?.responder_id && checkData?.responder_id !== responderId)) {
        alert('This request has already been taken by another responder');
        fetchRequests();
        return;
      }

      const { error } = await supabase
        .from('emergency_requests')
        .update({
          status: 'accepted',
          responder_id: responderId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .or(`responder_id.is.null,responder_id.eq.${responderId}`)
        .eq('status', 'pending');

      if (error) {
        console.error('Error accepting request:', error);
        alert('Failed to accept request. It may have been taken by another responder.');
      } else {
        const request = requests.find((r) => r.id === id);
        if (request && userId) {
          await sendEmergencyMessage(userId, request.user_id, 'I have accepted your emergency request and am preparing to assist you.');
        }
      }

      fetchRequests();
    } catch (e) {
      console.error('Error accepting:', e);
    }
  };

  const decline = async (id: string) => {
    try {
      const { error } = await supabase
        .from('emergency_requests')
        .update({
          status: 'declined',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('status', 'pending');

      if (error) {
        console.error('Error declining:', error);
      } else {
        setDeclinedIds((prev) => [...prev, id]);
        alert('Request declined. It will be sent to another responder.');
      }
      fetchRequests();
    } catch (e) {
      console.error('Error declining:', e);
    }
  };

  const updateStatus = async (
    id: string,
    status: EmergencyRequest['status'],
    location?: { lat: number; lng: number }
  ) => {
    try {
      await updateEmergencyStatus(id, status, location);

      const request = requests.concat(history).find((r) => r.id === id);
      if (request && userId) {
        let message = '';
        switch (status) {
          case 'en_route':
            message = 'I am now en route to your location. You can track my live location on the map.';
            break;
          case 'completed':
            message = 'I have marked this emergency as completed. Please stay safe.';
            break;
          case 'cancelled':
            message = 'I have had to cancel this assignment. Another responder may be assigned or you can request again.';
            break;
          case 'accepted':
            message = 'I have accepted your request and will be starting soon.';
            break;
        }
        if (message) {
          await sendEmergencyMessage(userId, request.user_id, message);
        }
      }

      if (status === 'cancelled') {
        alert('Request cancelled.');
      }
      fetchRequests();
    } catch (e) {
      console.error('Error updating status:', e);
    }
  };

  const updateLocation = useCallback(async (
    id: string,
    location: { lat: number; lng: number }
  ) => {
    try {
      await updateEmergencyStatus(id, 'en_route', location);
    } catch (e) {
      console.error('Error updating location:', e);
    }
  }, []);

  const sendMessage = async (receiverId: string, content: string) => {
    if (!userId) return false;
    try {
      await sendEmergencyMessage(userId, receiverId, content);
      return true;
    } catch (e) {
      console.error('Error in sendMessage:', e);
      return false;
    }
  };

  useEffect(() => {
    fetchRequests();

    const ch = supabase
      .channel('emergency-requests-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_requests'
        },
        (payload) => {
          console.log('Real-time update:', payload);
          fetchRequests();
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchRequests]);

  return {
    requests,
    history,
    loading,
    accept,
    decline,
    updateStatus,
    updateLocation,
    sendMessage,
    refetch: fetchRequests
  };
}
