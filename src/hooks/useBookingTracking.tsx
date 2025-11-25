
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface BookingWithTracking {
  id: string;
  ad_id: string;
  customer_id: string;
  worker_id: string;
  status: string;
  provider_location_lat?: number;
  provider_location_lng?: number;
  eta_minutes?: number;
  status_history: any[];
  payment_method?: string;
  payment_status: string;
  total_amount?: number;
  emergency_contact?: any;
  created_at: string;
  service_date?: string;
  message?: string;
  ad: {
    title: string;
    price: number;
  };
  worker: {
    full_name: string;
    phone_number?: string;
    profile_image_url?: string;
  };
  customer: {
    full_name: string;
    phone_number?: string;
  };
}

export const useBookingTracking = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeBookings, setActiveBookings] = useState<BookingWithTracking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveBookings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          ad:ads!inner(title, price),
          worker:profiles!bookings_worker_id_fkey(full_name, phone_number, profile_image_url),
          customer:profiles!bookings_customer_id_fkey(full_name, phone_number)
        `)
        .or(`customer_id.eq.${user.id},worker_id.eq.${user.id}`)
        .in('status', ['pending', 'accepted', 'in_progress', 'en_route'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedBookings = (data || []).map(booking => {
        const workerData = Array.isArray(booking.worker) ? booking.worker[0] : booking.worker;
        const customerData = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
        
        return {
          ...booking,
          status_history: Array.isArray(booking.status_history) ? booking.status_history : [],
          ad: {
            title: booking.ad?.title || 'Unknown Service',
            price: booking.ad?.price || 0
          },
          worker: {
            full_name: workerData?.full_name || 'Unknown Worker',
            phone_number: workerData?.phone_number,
            profile_image_url: workerData?.profile_image_url
          },
          customer: {
            full_name: customerData?.full_name || 'Unknown Customer',
            phone_number: customerData?.phone_number
          }
        };
      });
      
      setActiveBookings(transformedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string, location?: { lat: number; lng: number }) => {
    try {
      const statusUpdate = {
        status: newStatus,
        timestamp: new Date().toISOString(),
        updated_by: user?.id
      };

      const updateData: any = {
        status: newStatus
      };

      // Get current status history
      const { data: currentBooking } = await supabase
        .from('bookings')
        .select('status_history')
        .eq('id', bookingId)
        .single();

      const currentHistory = Array.isArray(currentBooking?.status_history) 
        ? currentBooking.status_history 
        : [];

      updateData.status_history = [...currentHistory, statusUpdate];

      if (location) {
        updateData.provider_location_lat = location.lat;
        updateData.provider_location_lng = location.lng;
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Booking status changed to ${newStatus.replace('_', ' ')}`,
      });

      fetchActiveBookings();
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive",
      });
    }
  };

  const updateETA = async (bookingId: string, etaMinutes: number) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ eta_minutes: etaMinutes })
        .eq('id', bookingId);

      if (error) throw error;

      fetchActiveBookings();
    } catch (error) {
      console.error('Error updating ETA:', error);
    }
  };

  const shareEmergencyContact = async (bookingId: string, emergencyContact: any) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ emergency_contact: emergencyContact })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Emergency contact shared",
        description: "Your emergency contact has been shared with the service provider",
      });

      fetchActiveBookings();
    } catch (error) {
      console.error('Error sharing emergency contact:', error);
      toast({
        title: "Error",
        description: "Failed to share emergency contact",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchActiveBookings();

    // Set up real-time subscription for booking updates
    const channel = supabase
      .channel('booking-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings'
        },
        () => {
          fetchActiveBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    activeBookings,
    loading,
    updateBookingStatus,
    updateETA,
    shareEmergencyContact,
    refetch: fetchActiveBookings
  };
};
