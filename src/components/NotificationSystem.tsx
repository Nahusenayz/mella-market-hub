import React, { useState, useEffect } from 'react';
import { Bell, X, MessageCircle, Calendar, User, Check, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'message' | 'booking_request' | 'booking_response' | 'rating' | 'general';
  read: boolean;
  created_at: string;
  data?: any;
}

export const NotificationSystem: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    
    // Set up real-time subscription for notifications
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New notification:', payload);
          const newNotification = payload.new as any;
          const mappedNotification: Notification = {
            id: newNotification.id,
            title: newNotification.title,
            message: newNotification.message,
            type: newNotification.type as Notification['type'],
            read: newNotification.read,
            created_at: newNotification.created_at,
            data: newNotification.data
          };
          setNotifications(prev => [mappedNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast notification
          toast({
            title: mappedNotification.title,
            description: mappedNotification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      const mappedNotifications: Notification[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        message: item.message,
        type: item.type as Notification['type'],
        read: item.read,
        created_at: item.created_at,
        data: item.data
      }));

      setNotifications(mappedNotifications);
      const unread = mappedNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleBookingAction = async (notificationId: string, bookingId: string, action: 'accept' | 'reject') => {
    try {
      // Update booking status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
        .eq('id', bookingId);

      if (bookingError) {
        console.error('Error updating booking:', bookingError);
        return;
      }

      // Get booking details for notification
      const { data: booking } = await supabase
        .from('bookings')
        .select(`
          *,
          ads(title),
          profiles!customer_id(full_name, phone_number)
        `)
        .eq('id', bookingId)
        .single();

      if (booking) {
        // Send notification to customer
        await supabase
          .from('notifications')
          .insert([{
            user_id: booking.customer_id,
            type: 'booking_response',
            title: `Booking ${action === 'accept' ? 'Accepted' : 'Rejected'}`,
            message: `Your booking request for "${booking.ads?.title}" has been ${action}ed.`,
            data: {
              booking_id: bookingId,
              action: action,
              service_title: booking.ads?.title
            }
          }]);
      }

      // Mark notification as read
      await markAsRead(notificationId);

      toast({
        title: "Success",
        description: `Booking request ${action}ed successfully.`,
      });

      fetchNotifications(); // Refresh notifications
    } catch (error) {
      console.error('Error handling booking action:', error);
      toast({
        title: "Error",
        description: "Failed to process booking request.",
        variant: "destructive"
      });
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle size={16} className="text-blue-500" />;
      case 'booking_request':
        return <Calendar size={16} className="text-green-500" />;
      case 'booking_response':
        return <Check size={16} className="text-purple-500" />;
      case 'rating':
        return <User size={16} className="text-yellow-500" />;
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 ${
                    !notification.read ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      
                      {/* Customer Information for Booking Requests */}
                      {notification.type === 'booking_request' && notification.data && (
                        <div className="mt-2 p-2 bg-gray-50 rounded border">
                          <p className="text-xs text-gray-600 mb-1">Customer Details:</p>
                          <p className="text-sm font-medium">{notification.data.customer_name}</p>
                          {notification.data.customer_phone && (
                            <div className="flex items-center gap-1 mt-1">
                              <Phone size={12} className="text-gray-500" />
                              <a 
                                href={`tel:${notification.data.customer_phone}`}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                {notification.data.customer_phone}
                              </a>
                            </div>
                          )}
                          {notification.data.message && (
                            <p className="text-xs text-gray-500 mt-1 italic">
                              "{notification.data.message}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Booking Request Actions */}
                      {notification.type === 'booking_request' && notification.data?.booking_id && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleBookingAction(notification.id, notification.data.booking_id, 'accept')}
                            className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleBookingAction(notification.id, notification.data.booking_id, 'reject')}
                            className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      <p className="text-xs text-gray-500 mt-2">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
