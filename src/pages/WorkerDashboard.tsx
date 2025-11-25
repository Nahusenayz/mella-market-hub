
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useBookingTracking } from '@/hooks/useBookingTracking';
import { useMessages } from '@/hooks/useMessages';
import { BookingTracker } from '@/components/BookingTracker';
import { MessageThread } from '@/components/MessageThread';
import { Navbar } from '@/components/Navbar';
import { MapPin, Clock, Phone, Check, X, Navigation, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const WorkerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeBookings, loading, updateBookingStatus, updateETA } = useBookingTracking();
  const { conversations, messages, sendMessage, fetchMessages } = useMessages();
  const [selectedMessageUser, setSelectedMessageUser] = useState<{
    id: string;
    name: string;
    image?: string;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationSharing, setIsLocationSharing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
  }, [user, navigate]);

  // Get and share real-time location
  useEffect(() => {
    if (navigator.geolocation && isLocationSharing) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newLocation);
          
          // Update location for all active bookings
          activeBookings.forEach(booking => {
            if (booking.status === 'accepted' || booking.status === 'en_route') {
              updateBookingStatus(booking.id, booking.status, newLocation);
            }
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast({
            title: "Location Error",
            description: "Unable to get your location. Please enable location services.",
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isLocationSharing, activeBookings, updateBookingStatus, toast]);

  const handleAcceptBooking = async (bookingId: string) => {
    await updateBookingStatus(bookingId, 'accepted');
    toast({
      title: "Booking Accepted",
      description: "You have accepted the booking request.",
    });
  };

  const handleRejectBooking = async (bookingId: string) => {
    await updateBookingStatus(bookingId, 'rejected');
    toast({
      title: "Booking Rejected",
      description: "You have rejected the booking request.",
    });
  };

  const handleStartTrip = async (bookingId: string) => {
    if (userLocation) {
      await updateBookingStatus(bookingId, 'en_route', userLocation);
      setIsLocationSharing(true);
      toast({
        title: "Trip Started",
        description: "Your location is now being shared with the customer.",
      });
    } else {
      toast({
        title: "Location Required",
        description: "Please enable location sharing to start the trip.",
        variant: "destructive",
      });
    }
  };

  const handleMessageUser = (userId: string, userName: string, userImage?: string) => {
    setSelectedMessageUser({ id: userId, name: userName, image: userImage });
  };

  const handleCloseMessage = () => {
    setSelectedMessageUser(null);
  };

  const toggleLocationSharing = () => {
    setIsLocationSharing(!isLocationSharing);
    if (!isLocationSharing) {
      toast({
        title: "Location Sharing Enabled",
        description: "Your location will be shared with customers during active bookings.",
      });
    } else {
      toast({
        title: "Location Sharing Disabled",
        description: "Location sharing has been turned off.",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-blue-50 to-indigo-50 pb-4">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Worker Dashboard</h1>
              <p className="text-gray-600">Manage your service requests and track your earnings</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <Home size={16} />
                Home
              </button>
              <button
                onClick={toggleLocationSharing}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isLocationSharing
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
              >
                <MapPin size={16} />
                {isLocationSharing ? 'Location Sharing On' : 'Enable Location Sharing'}
              </button>
            </div>
          </div>
        </div>

        {!selectedMessageUser ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Active Requests */}
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Active Requests</h2>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {activeBookings.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Clock size={48} className="mx-auto mb-3 text-gray-300" />
                    <p>No active requests</p>
                  </div>
                ) : (
                  activeBookings.map((booking) => (
                    <div key={booking.id} className="p-6 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 mb-1">{booking.ad.title}</h3>
                          <p className="text-gray-600 text-sm mb-2">
                            Customer: {booking.customer.full_name}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>ETB {booking.ad.price.toLocaleString()}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              booking.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                              booking.status === 'en_route' ? 'bg-purple-100 text-purple-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {booking.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {booking.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAcceptBooking(booking.id)}
                              className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition-colors text-sm flex items-center gap-1"
                            >
                              <Check size={14} />
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectBooking(booking.id)}
                              className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center gap-1"
                            >
                              <X size={14} />
                              Reject
                            </button>
                          </>
                        )}
                        
                        {booking.status === 'accepted' && (
                          <button
                            onClick={() => handleStartTrip(booking.id)}
                            className="bg-purple-500 text-white px-3 py-1 rounded-lg hover:bg-purple-600 transition-colors text-sm flex items-center gap-1"
                          >
                            <Navigation size={14} />
                            Start Trip
                          </button>
                        )}

                        <button
                          onClick={() => handleMessageUser(booking.customer_id, booking.customer.full_name)}
                          className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center gap-1"
                        >
                          <Phone size={14} />
                          Message
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Booking Tracker */}
            <BookingTracker />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <MessageThread
              otherUserId={selectedMessageUser.id}
              otherUserName={selectedMessageUser.name}
              otherUserImage={selectedMessageUser.image}
              onBack={handleCloseMessage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerDashboard;
