
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSocialFeed } from './useSocialFeed';

interface BookingData {
  adId: string;
  workerId: string;
  message?: string;
  serviceDate?: string;
}

export const useBookings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createActivity } = useSocialFeed();
  const [loading, setLoading] = useState(false);

  const createBooking = async (bookingData: BookingData) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to book a service",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Get customer profile with all details
      const { data: customerProfile } = await supabase
        .from('profiles')
        .select('full_name, phone_number, email')
        .eq('id', user.id)
        .single();

      // Get ad details
      const { data: adData } = await supabase
        .from('ads')
        .select('title, user_id, price')
        .eq('id', bookingData.adId)
        .single();

      if (!adData) {
        throw new Error('Ad not found');
      }

      // Create booking
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert([{
          ad_id: bookingData.adId,
          customer_id: user.id,
          worker_id: bookingData.workerId,
          message: bookingData.message,
          service_date: bookingData.serviceDate,
          total_amount: adData.price,
          payment_status: 'pending'
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Create notification for the worker with detailed customer info
      const customerName = customerProfile?.full_name || user.email || 'Anonymous Customer';
      const customerPhone = customerProfile?.phone_number || 'Not provided';
      const customerEmail = customerProfile?.email || user.email || 'Not provided';

      await supabase
        .from('notifications')
        .insert([{
          user_id: bookingData.workerId,
          type: 'booking_request',
          title: 'New Booking Request',
          message: `${customerName} wants to book your service "${adData.title}" for ETB ${adData.price?.toLocaleString()}`,
          data: {
            booking_id: booking.id,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: customerEmail,
            ad_title: adData.title,
            ad_price: adData.price,
            message: bookingData.message,
            service_date: bookingData.serviceDate
          }
        }]);

      // Create social feed activity (optional - silently fail if unavailable)
      try {
        createActivity('new_booking', {
          service_title: adData.title,
          service_price: adData.price,
          worker_id: bookingData.workerId
        }, 'public');
      } catch (err) {
        console.log('Social feed activity not created');
      }

      toast({
        title: "Booking request sent!",
        description: "The service provider will contact you soon.",
      });

      return booking;
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Booking failed",
        description: "Unable to send booking request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    createBooking,
    loading
  };
};
