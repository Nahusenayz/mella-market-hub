
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useBookingTracking } from '@/hooks/useBookingTracking';
import { useMessages } from '@/hooks/useMessages';
import { useEmergencyRequests, EmergencyRequest } from '@/hooks/useEmergencyRequests';
import { supabase } from '@/integrations/supabase/client';
import { BookingTracker } from '@/components/BookingTracker';
import { MessageThread } from '@/components/MessageThread';
import { Navbar } from '@/components/Navbar';
import { TrackingMap } from '@/components/TrackingMapGoogle';
import { MapPin, Clock, Phone, Check, X, Navigation, Home, Flag, Bell, BellRing } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function playAlarm() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    const frequencies = [880, 660, 880, 660];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, now + i * 0.2);
      osc.type = 'square';
      gain.gain.setValueAtTime(0.15, now + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.15);
      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.15);
    });
  } catch {}
}

function requestBrowserNotification(title: string, body: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/logo.png' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') new Notification(title, { body, icon: '/logo.png' });
    });
  }
}

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

  const [newRequestCount, setNewRequestCount] = useState(0);
  const [hasNewRequest, setHasNewRequest] = useState(false);
  const emergencySectionRef = useRef<HTMLDivElement>(null);

  const handleNewRequest = useCallback((req: EmergencyRequest) => {
    playAlarm();
    setNewRequestCount(c => c + 1);
    setHasNewRequest(true);
    requestBrowserNotification(
      'New Emergency Request!',
      `${req.category || 'Emergency'} — ${req.details?.slice(0, 60) || 'Tap to view'}`
    );
  }, []);

  const { requests: emergencyRequests, acceptRequest: acceptEmergency, declineRequest: declineEmergency, updateStatus: updateEmergencyStatus } = useEmergencyRequests(handleNewRequest);

  const clearNewRequestIndicator = () => {
    setNewRequestCount(0);
    setHasNewRequest(false);
  };
  const [workerCategory, setWorkerCategory] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState({ standard: 0, emergency: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const { count: stdCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('worker_id', user.id)
        .eq('status', 'completed');
        
      const { count: emgCount } = await (supabase as any)
        .from('emergency_requests')
        .select('*', { count: 'exact', head: true })
        .eq('responder_id', user.id)
        .eq('status', 'completed');

      setCompletedCount({
        standard: stdCount || 0,
        emergency: emgCount || 0
      });
    };

    fetchStats();

    const sub = supabase.channel('completed-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `worker_id=eq.${user.id}` }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_requests', filter: `responder_id=eq.${user.id}` }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('badges')
        .eq('id', user.id)
        .single();
      if (data && Array.isArray(data.badges)) {
        const badgesArray = data.badges as any[];
        const categoryBadge = badgesArray.find((b: any) => typeof b === 'object' && b !== null && 'category' in b);
        if (categoryBadge && typeof categoryBadge === 'object' && 'category' in categoryBadge) {
          setWorkerCategory(categoryBadge.category as string);
        }
      }
    };
    fetchProfile();
  }, [user]);

  const handleStartEmergencyRoute = async (id: string) => {
    if (!userLocation) {
      toast({ title: 'Location required', description: 'Enable location to start route', variant: 'destructive' });
      return;
    }
    await updateEmergencyStatus(id, 'en_route', userLocation);
    setIsLocationSharing(true);
  };

  const handleCompleteEmergency = async (id: string) => {
    await updateEmergencyStatus(id, 'completed');
  };

  const filteredEmergencyRequests = emergencyRequests.filter(req => {
    if (!workerCategory) return false;
    const cat = req.category?.toLowerCase() || '';
    if (workerCategory === 'hospital' && cat.includes('hospital')) return true;
    if (workerCategory === 'security' && (cat.includes('security') || cat.includes('police'))) return true;
    if (workerCategory === 'traffic' && cat.includes('traffic')) return true;
    if (workerCategory === 'fire' && cat.includes('fire')) return true;
    if (workerCategory === 'tow_truck' && cat.includes('tow')) return true;
    return false;
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
  }, [user, navigate]);

  // Get real-time location (but only share to DB if enabled)
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newLocation);
          
          // Update location for all active bookings ONLY if sharing is enabled
          if (isLocationSharing) {
            if (user) {
              supabase.from('worker_locations' as any).update({
                location_lat: newLocation.lat,
                location_lng: newLocation.lng,
                last_updated: new Date().toISOString()
              }).eq('worker_id', user.id).then(({ error }) => {
                if (error) console.error('Error updating worker location:', error);
              });
            }

            activeBookings.forEach(booking => {
              if (booking.status === 'accepted' || booking.status === 'en_route') {
                updateBookingStatus(booking.id, booking.status, newLocation);
              }
            });
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Only show error if they explicitly wanted to share
          if (isLocationSharing) {
            toast({
              title: "Location Error",
              description: "Unable to get your location. Please enable location services.",
              variant: "destructive",
            });
            setIsLocationSharing(false);
          }
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
              <div className="mt-2 inline-flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                <Check className="text-green-600 w-4 h-4" />
                <span className="text-sm font-semibold text-green-700">
                  {completedCount.standard + completedCount.emergency} Requests Completed
                </span>
              </div>
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
            <div className="flex flex-col gap-8">
              {/* Emergency Requests */}
              {workerCategory && (
                <div
                  ref={emergencySectionRef}
                  onClick={clearNewRequestIndicator}
                  className={`bg-white rounded-xl shadow-lg border-2 transition-all duration-300 ${
                    hasNewRequest ? 'border-red-500 shadow-red-200 animate-pulse' : 'border-red-100'
                  }`}
                >
                  <div className="p-6 border-b border-gray-200 bg-red-50 rounded-t-xl">
                    <h2 className="text-xl font-bold text-red-800 flex items-center gap-2">
                       {hasNewRequest ? <BellRing size={20} className="animate-bounce text-red-600" /> : <Flag size={20} />}
                       Emergency Requests <span className="capitalize text-lg">({workerCategory})</span>
                       {newRequestCount > 0 && (
                         <span className="ml-auto bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1">
                           <Bell size={14} /> {newRequestCount} new
                         </span>
                       )}
                    </h2>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {filteredEmergencyRequests.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <Clock size={48} className="mx-auto mb-3 text-red-200" />
                        <p>No active emergencies</p>
                      </div>
                    ) : (
                      filteredEmergencyRequests.map((r) => (
                        <div key={r.id} className="p-6 border-b border-gray-100 last:border-b-0">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-800 mb-1 capitalize">{r.category || 'Emergency'}</h3>
                              <p className="text-gray-600 text-sm mb-2">{r.details || 'No details provided'}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  r.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                                  r.status === 'en_route' ? 'bg-purple-100 text-purple-800' :
                                  r.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {r.status.replace('_', ' ').toUpperCase()}
                                </span>
                                {r.details?.startsWith('{') && (
                                  <span className="font-bold text-green-600">
                                    ETB {JSON.parse(r.details).price?.toLocaleString()}
                                  </span>
                                )}
                                {r.user_location_lat && r.user_location_lng && (
                                  <a
                                    className="text-blue-600 underline flex items-center gap-1"
                                    href={`https://maps.google.com/?q=${r.user_location_lat},${r.user_location_lng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <MapPin size={14} /> Navigate to caller
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {r.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => acceptEmergency(r.id)}
                                  className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition-colors text-sm flex items-center gap-1"
                                >
                                  <Check size={14} /> Accept
                                </button>
                                <button
                                  onClick={() => declineEmergency(r.id)}
                                  className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center gap-1"
                                >
                                  <X size={14} /> Decline
                                </button>
                              </>
                            )}
                            
                            {r.status === 'accepted' && (
                              <button
                                onClick={() => handleStartEmergencyRoute(r.id)}
                                className="bg-purple-500 text-white px-3 py-1 rounded-lg hover:bg-purple-600 transition-colors text-sm flex items-center gap-1"
                              >
                                <Navigation size={14} /> Start Route
                              </button>
                            )}
                            {(r.status === 'accepted' || r.status === 'en_route') && (
                              <>
                                <button
                                  onClick={() => handleCompleteEmergency(r.id)}
                                  className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                                >
                                  <Check size={14} /> Mark Completed
                                </button>
                                <button
                                  onClick={() => {
                                      if (window.confirm("Are you sure you want to delete this emergency request?")) {
                                          updateEmergencyStatus(r.id, 'cancelled');
                                      }
                                  }}
                                  className="bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 transition-colors text-sm flex items-center gap-1"
                                >
                                  <X size={14} /> Delete
                                </button>
                              </>
                            )}
                          </div>

                          {/* Live Location Map */}
                          {(r.status === 'accepted' || r.status === 'en_route') && r.user_location_lat && r.user_location_lng && userLocation && (
                            <div className="mt-4 h-64 rounded-lg overflow-hidden border border-gray-200 shadow-inner relative">
                               <div className="absolute top-2 left-2 z-[400] bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-semibold text-gray-700 shadow-sm border border-gray-100 flex items-center gap-1">
                                 <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Live Tracking
                               </div>
                               <TrackingMap 
                                  userLocation={{ lat: r.user_location_lat, lng: r.user_location_lng }}
                                  responderLocation={userLocation}
                                  responderType={workerCategory || undefined}
                               />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

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
                        
                        {booking.status === 'en_route' && (
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'in_progress')}
                            className="bg-orange-500 text-white px-3 py-1 rounded-lg hover:bg-orange-600 transition-colors text-sm flex items-center gap-1"
                          >
                            <MapPin size={14} /> Start Service
                          </button>
                        )}

                        {(booking.status === 'accepted' || booking.status === 'en_route' || booking.status === 'in_progress') && (
                          <>
                             <button
                               onClick={() => updateBookingStatus(booking.id, 'completed')}
                               className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                             >
                               <Check size={14} /> Complete
                             </button>
                             <button
                               onClick={() => {
                                 if (window.confirm("Are you sure you want to delete this booking?")) {
                                   updateBookingStatus(booking.id, 'cancelled');
                                 }
                               }}
                               className="bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 transition-colors text-sm flex items-center gap-1"
                             >
                               <X size={14} /> Delete
                             </button>
                          </>
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
