import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { EmergencyAssistant } from '@/components/EmergencyAssistant';
import { FirstAidChatbot } from '@/components/FirstAidChatbot';
import { MapView } from '@/components/MapView';
import { TrackingMap } from '@/components/TrackingMap';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  MapPin,
  Phone,
  Hospital,
  Shield,
  Flame,
  Car,
  Bot,
  Globe,
  Navigation,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Activity,
  PhoneCall,
  MapPinned,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkerLocations } from '@/hooks/useWorkerLocations';

interface EmergencyStation {
  id: string;
  name: string;
  type: 'hospital' | 'police' | 'fire' | 'ambulance';
  location: { lat: number; lng: number };
  distance: number;
  phone: string;
  isOpen: boolean;
  responseTime: string;
}

interface ActiveRequest {
  id: string;
  status: string;
  category: string;
  responder_id: string | null;
  created_at: string;
  responder_location_lat?: number;
  responder_location_lng?: number;
}

const EMERGENCY_CATEGORIES = [
  { key: 'police', label: 'Police', icon: '👮', color: '#1e40af', description: 'Crime, accidents, safety' },
  { key: 'ambulance', label: 'Medical', icon: '🚑', color: '#dc2626', description: 'Health emergencies' },
  { key: 'fire_truck', label: 'Fire', icon: '🚒', color: '#ea580c', description: 'Fire emergencies' },
  { key: 'traffic_police', label: 'Traffic', icon: '🚦', color: '#d97706', description: 'Traffic incidents' },
  { key: 'tow_truck', label: 'Tow', icon: '🏗️', color: '#4b5563', description: 'Vehicle breakdown' }
];

export const Emergency: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const [userLocation, setUserLocation] = useState({ lat: 9.0320, lng: 38.7469 });
  const [emergencyStations, setEmergencyStations] = useState<EmergencyStation[]>([]);
  const [showEmergencyAssistant, setShowEmergencyAssistant] = useState(false);
  const [showFirstAidBot, setShowFirstAidBot] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [requestDetails, setRequestDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRequest, setActiveRequest] = useState<ActiveRequest | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const mapRef = useRef<HTMLDivElement>(null);

  // Fetch available workers
  const { workers, loading: workersLoading, getNearbyWorkers, refetch: refetchWorkers } = useWorkerLocations();

  // Get user's real-time location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newLocation);
          setIsLoadingLocation(false);
          generateNearbyEmergencyStations(newLocation);
        },
        (error) => {
          console.log('Geolocation error:', error);
          setIsLoadingLocation(false);
          generateNearbyEmergencyStations(userLocation);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setIsLoadingLocation(false);
      generateNearbyEmergencyStations(userLocation);
    }
  }, []);

  // Subscribe to active request updates
  useEffect(() => {
    if (!activeRequest) return;

    const channel = supabase
      .channel('active-request-' + activeRequest.id)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'emergency_requests',
          filter: `id=eq.${activeRequest.id}`
        },
        (payload) => {
          setActiveRequest(payload.new as ActiveRequest);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRequest?.id]);

  // Subscribe to responder location when en_route
  useEffect(() => {
    if (activeRequest?.status !== 'en_route' || !activeRequest?.responder_id) return;

    console.log('🛰️ Subscribing to responder location:', activeRequest.responder_id);

    const channel = supabase
      .channel('responder-tracking')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'worker_locations',
          filter: `worker_id=eq.${activeRequest.responder_id}`
        },
        (payload) => {
          console.log('📍 New responder location:', payload.new);
          const newLoc = payload.new;
          if (newLoc.location_lat && newLoc.location_lng) {
            setActiveRequest(prev => prev ? ({
              ...prev,
              responder_location_lat: newLoc.location_lat,
              responder_location_lng: newLoc.location_lng
            }) : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRequest?.status, activeRequest?.responder_id]);

  // Check for existing active requests on mount
  useEffect(() => {
    const checkActiveRequest = async () => {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) return;

      const { data } = await supabase
        .from('emergency_requests' as any)
        .select('*')
        .eq('user_id', session.user.id)
        .in('status', ['pending', 'accepted', 'en_route'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setActiveRequest(data[0] as unknown as ActiveRequest);
      }
    };

    checkActiveRequest();
  }, []);

  // Refresh workers periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refetchWorkers();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [refetchWorkers]);

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const generateNearbyEmergencyStations = (location: { lat: number; lng: number }) => {
    const stations: EmergencyStation[] = [
      {
        id: '1',
        name: language === 'am' ? 'ጠቅላላ ሆስፒታል' : 'General Hospital',
        type: 'hospital',
        location: { lat: location.lat + 0.02, lng: location.lng + 0.01 },
        distance: 0,
        phone: '+251-11-123-4567',
        isOpen: true,
        responseTime: '5-8 min'
      },
      {
        id: '2',
        name: language === 'am' ? 'ማዕከላዊ ፖሊስ ጣቢያ' : 'Central Police Station',
        type: 'police',
        location: { lat: location.lat - 0.015, lng: location.lng + 0.025 },
        distance: 0,
        phone: '+251-11-765-4321',
        isOpen: true,
        responseTime: '3-6 min'
      },
      {
        id: '3',
        name: language === 'am' ? 'የእሳት አደጋ መከላከያ ጣቢያ' : 'Fire Department Station',
        type: 'fire',
        location: { lat: location.lat + 0.01, lng: location.lng - 0.02 },
        distance: 0,
        phone: '+251-11-987-6543',
        isOpen: true,
        responseTime: '4-7 min'
      },
      {
        id: '4',
        name: language === 'am' ? 'የአደጋ ጊዜ ህክምና ማዕከል' : 'Emergency Medical Center',
        type: 'ambulance',
        location: { lat: location.lat - 0.008, lng: location.lng - 0.015 },
        distance: 0,
        phone: '+251-11-456-7890',
        isOpen: true,
        responseTime: '6-10 min'
      }
    ];

    const stationsWithDistance = stations.map(station => ({
      ...station,
      distance: calculateDistance(
        location.lat,
        location.lng,
        station.location.lat,
        station.location.lng
      )
    })).sort((a, b) => a.distance - b.distance);

    setEmergencyStations(stationsWithDistance);
  };

  const getStationIcon = (type: string) => {
    switch (type) {
      case 'hospital': return <Hospital className="h-5 w-5" />;
      case 'police': return <Shield className="h-5 w-5" />;
      case 'fire': return <Flame className="h-5 w-5" />;
      case 'ambulance': return <Car className="h-5 w-5" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getStationColor = (type: string) => {
    switch (type) {
      case 'hospital': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'police': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'fire': return 'bg-red-100 text-red-800 border-red-200';
      case 'ambulance': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Send request to a specific worker - Uber-like one-click request
  const callResponder = async (worker: any) => {
    console.log('🚨 Call Responder clicked for:', worker);
    console.log('Current activeRequest:', activeRequest);

    const { data: session } = await supabase.auth.getUser();
    const userId = session.user?.id;
    console.log('User ID:', userId);

    if (!userId) {
      alert('Please sign in to request help.');
      return;
    }

    if (activeRequest) {
      console.log('⚠️ Already have active request, showing alert');
      alert('You already have an active request. Please wait or cancel it first.');
      return;
    }

    console.log('✓ No active request, proceeding...');

    // Skip confirmation for faster Uber-like experience
    try {
      console.log('📤 Sending emergency request...');

      const requestData = {
        user_id: userId,
        status: 'pending',
        category: worker.category,
        details: `Emergency ${worker.category} assistance requested. Responder: ${worker.profiles?.full_name || 'Available'}`,
        user_location_lat: userLocation.lat,
        user_location_lng: userLocation.lng,
      };

      console.log('Request data:', requestData);

      const { data, error } = await supabase
        .from('emergency_requests' as any)
        .insert(requestData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating request:', error);
        alert(`Failed to send request: ${error.message}`);
        return;
      }

      console.log('✅ Emergency request created:', data);
      alert('🚨 Emergency request sent! The responder will see your request and can accept it.');

      setActiveRequest(data as unknown as ActiveRequest);
    } catch (e: any) {
      console.error('💥 Exception:', e);
      alert('Failed to send request. Please try again.');
    }
  };

  const createEmergencyRequest = async (targetWorkerId?: string) => {
    if (!selectedCategory && !targetWorkerId && !selectedWorker) {
      alert('Please select an emergency category');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getUser();
      const userId = session.user?.id;
      if (!userId) {
        alert('Please sign in to request help.');
        setIsSubmitting(false);
        return;
      }

      console.log('📤 Creating emergency request...');
      console.log('User ID:', userId);
      console.log('User Location:', userLocation);
      console.log('Category:', selectedCategory || selectedWorker?.category);

      const requestData = {
        user_id: userId,
        status: 'pending',
        category: selectedCategory || selectedWorker?.category,
        details: requestDetails || `Emergency ${selectedCategory || selectedWorker?.category} assistance requested`,
        user_location_lat: userLocation.lat,
        user_location_lng: userLocation.lng,
      };

      console.log('Request data:', requestData);

      const { data, error } = await supabase
        .from('emergency_requests' as any)
        .insert(requestData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating request:', error);
        alert(`Failed to send request: ${error.message}`);
        throw error;
      }

      console.log('✅ Emergency request created:', data);
      alert('🚨 Emergency request sent! A responder will accept shortly.');

      setActiveRequest(data as unknown as ActiveRequest);
      setShowRequestModal(false);
      setSelectedCategory(null);
      setSelectedWorker(null);
      setRequestDetails('');
    } catch (e: any) {
      console.error('💥 Exception:', e);
      alert('Failed to send request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelRequest = async () => {
    if (!activeRequest) return;

    if (!window.confirm('Are you sure you want to cancel this emergency request?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('emergency_requests' as any)
        .update({ status: 'cancelled' })
        .eq('id', activeRequest.id);

      if (error) throw error;
      setActiveRequest(null);
      alert('Your request has been cancelled.');
    } catch (e) {
      console.error(e);
      alert('Failed to cancel request. Please try again.');
    }
  };

  const handleEmergencyCall = (phone: string) => {
    window.open(`tel:${phone}`);
  };

  // Transform workers for map display
  const transformWorkersForMap = () => {
    const nearbyWorkers = getNearbyWorkers(userLocation.lat, userLocation.lng, 50);
    return nearbyWorkers.map(worker => {
      const catInfo = EMERGENCY_CATEGORIES.find(c => c.key === worker.category);
      return {
        id: worker.id,
        title: worker.profiles?.full_name || 'Available Responder',
        description: `${catInfo?.icon || '👷'} ${catInfo?.label || worker.category} • ${worker.distance?.toFixed(1)}km away`,
        price: 0,
        category: worker.category,
        provider: worker.profiles?.full_name || 'Responder',
        rating: 5,
        distance: worker.distance || 0,
        image: worker.profiles?.profile_image_url || '/placeholder.svg',
        location: { lat: worker.location_lat, lng: worker.location_lng },
        user_id: worker.worker_id,
        profiles: {
          full_name: worker.profiles?.full_name || 'Responder',
          rating: 5,
          profile_image_url: worker.profiles?.profile_image_url || '/placeholder.svg'
        }
      };
    });
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: <Loader2 className="h-5 w-5 animate-spin" />, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Finding responder...' };
      case 'accepted':
        return { icon: <CheckCircle className="h-5 w-5" />, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Responder assigned!' };
      case 'en_route':
        return { icon: <Navigation className="h-5 w-5" />, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Responder on the way!' };
      default:
        return { icon: <Clock className="h-5 w-5" />, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', label: status };
    }
  };

  // Get all workers and filter by category
  const allWorkers = getNearbyWorkers(userLocation.lat, userLocation.lng, 100);
  const filteredWorkers = filterCategory === 'all'
    ? allWorkers
    : allWorkers.filter(w => w.category === filterCategory);

  // Get category counts
  const categoryCounts = EMERGENCY_CATEGORIES.map(cat => ({
    ...cat,
    count: allWorkers.filter(w => w.category === cat.key).length
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t('emergencyTitle')}</h1>
                <p className="text-red-100">{t('emergencySubtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
                className="text-white hover:bg-white/20"
              >
                <Globe className="h-4 w-4 mr-2" />
                {language === 'en' ? 'አማርኛ' : 'English'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Request Banner - Enhanced with Uber-like tracking */}
      {/* Active Request Banner - Enhanced with Uber-like tracking */}
      {/* Active Request Status Card (Pending/Accepted) - Shows standard status card */}
      {activeRequest && activeRequest.status !== 'en_route' && (
        <div className="container mx-auto px-4 py-4">
          <div className={`rounded-2xl overflow-hidden border-2 ${getStatusInfo(activeRequest.status).border + ' ' + getStatusInfo(activeRequest.status).bg}`}>
            {/* Header Section */}
            <div className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${getStatusInfo(activeRequest.status).bg}`}>
                    {getStatusInfo(activeRequest.status).icon}
                  </div>
                  <div>
                    <h3 className={`font-bold text-lg ${getStatusInfo(activeRequest.status).color}`}>
                      {getStatusInfo(activeRequest.status).label}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {activeRequest.category} emergency • {new Date(activeRequest.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelRequest}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            </div>

            {/* Accepted Status - Show waiting for responder to start */}
            {activeRequest.status === 'accepted' && (
              <div className="px-4 pb-4">
                <div className="bg-green-50 rounded-xl p-4 border border-green-200 text-center">
                  <div className="text-4xl mb-2">✅</div>
                  <div className="font-semibold text-green-700">Responder Accepted!</div>
                  <div className="text-sm text-gray-600 mt-1">They will start heading to you shortly...</div>
                  <div className="mt-3 flex items-center justify-center gap-2 text-green-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Waiting for responder to start route</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Live Tracking Popup (En Route) - Overlays on bottom right */}
      {activeRequest && activeRequest.status === 'en_route' && (
        <div className="fixed bottom-0 left-0 right-0 md:bottom-4 md:right-4 md:left-auto md:w-96 z-[9999] p-2 md:p-0">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom duration-500">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-start">
              <div className="flex gap-3">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <span className="text-2xl">🚑</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Ambulance Dispatched</h3>
                  <p className="text-blue-100/90 text-sm font-medium mt-0.5">ETA: ~4 min</p>
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="h-48 bg-gray-100 relative">
              {activeRequest.responder_location_lat && activeRequest.responder_location_lng ? (
                <TrackingMap
                  userLocation={userLocation}
                  responderLocation={{
                    lat: activeRequest.responder_location_lat,
                    lng: activeRequest.responder_location_lng
                  }}
                  responderType={activeRequest.category}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  Connecting to GPS...
                </div>
              )}
            </div>

            {/* Footer Details */}
            <div className="p-4 bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-gray-600">Live Updates Active</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 bg-green-600 hover:bg-green-700 gap-2 h-10">
                  <Phone className="w-4 h-4" /> Contact
                </Button>
                <Button variant="outline" className="flex-1 gap-2 h-10" onClick={() => handleEmergencyCall('991')}>
                  <Shield className="w-4 h-4" /> 991
                </Button>
                <Button
                  variant="ghost"
                  className="w-full mt-2 text-red-600 hover:text-red-700 hover:bg-red-50 gap-2"
                  onClick={cancelRequest}
                >
                  <XCircle className="w-4 h-4" /> Cancel Request
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="container mx-auto px-4 py-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-600" />
              <span className="font-semibold text-gray-800">
                {allWorkers.length} Responders Online
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {categoryCounts.map(cat => cat.count > 0 && (
                <Badge
                  key={cat.key}
                  variant="secondary"
                  className="text-xs"
                  style={{ background: `${cat.color}15`, color: cat.color }}
                >
                  {cat.icon} {cat.count}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Button
            onClick={() => setShowEmergencyAssistant(true)}
            className="h-20 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white flex-col gap-2 emergency-pulse shadow-lg"
          >
            <AlertTriangle className="h-6 w-6" />
            <span className="text-sm font-medium">{t('emergencyAssistant')}</span>
          </Button>

          <Button
            onClick={() => setShowFirstAidBot(true)}
            className="h-20 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white flex-col gap-2 shadow-lg"
          >
            <Bot className="h-6 w-6" />
            <span className="text-sm font-medium">{t('firstAidBot')}</span>
          </Button>

          <Button
            onClick={() => {
              setSelectedWorker(null);
              setSelectedCategory(null);
              setShowRequestModal(true);
            }}
            disabled={!!activeRequest}
            className="h-20 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white flex-col gap-2 shadow-lg"
          >
            <PhoneCall className="h-6 w-6" />
            <span className="text-sm font-medium">Request Help</span>
          </Button>

          <Button
            onClick={() => handleEmergencyCall('991')}
            className="h-20 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white flex-col gap-2 shadow-lg"
          >
            <Phone className="h-6 w-6" />
            <span className="text-sm font-medium">{t('call911').replace('911', '991')}</span>
          </Button>
        </div>

        {/* Map with Workers */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <MapPinned className="h-5 w-5 text-orange-600" />
            Live Responder Map
          </h2>
          <div className="w-full h-[350px] rounded-xl overflow-hidden shadow-lg border border-gray-200">
            <MapView
              services={transformWorkersForMap()}
              userLocation={userLocation}
              distanceFilter={50}
            />
          </div>
        </div>

        {/* Available Responders Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <User className="h-5 w-5 text-orange-600" />
              Available Responders ({filteredWorkers.length})
            </h2>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterCategory === 'all'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
                  }`}
              >
                All
              </button>
              {EMERGENCY_CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setFilterCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${filterCategory === cat.key
                    ? 'text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
                    }`}
                  style={filterCategory === cat.key ? { background: cat.color } : {}}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {workersLoading ? (
            <div className="flex items-center justify-center py-12 bg-white rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
              <span className="ml-3 text-gray-600">Loading responders...</span>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-500 font-medium">No responders currently available</p>
              <p className="text-gray-400 text-sm mt-1">
                {filterCategory !== 'all' ? 'Try selecting a different category' : 'Check back soon'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWorkers.map((worker) => {
                const catInfo = EMERGENCY_CATEGORIES.find(c => c.key === worker.category);
                const timeSinceUpdate = Math.floor((Date.now() - new Date(worker.last_updated).getTime()) / 1000);
                const isRecentlyUpdated = timeSinceUpdate < 300; // Within 5 minutes

                return (
                  <Card
                    key={worker.id}
                    className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-orange-200"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{ background: `${catInfo?.color}20` }}
                        >
                          {catInfo?.icon || '👷'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 truncate">
                            {worker.profiles?.full_name || 'Available Responder'}
                          </h3>
                          <p className="text-sm text-gray-500">{catInfo?.label || worker.category}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              <MapPin className="h-3 w-3 mr-1" />
                              {worker.distance?.toFixed(1)}km
                            </Badge>
                            <span className={`flex items-center gap-1 text-xs ${isRecentlyUpdated ? 'text-green-600' : 'text-yellow-600'}`}>
                              <span className={`w-2 h-2 rounded-full ${isRecentlyUpdated ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                              {isRecentlyUpdated ? 'Live' : 'Last seen ' + Math.floor(timeSinceUpdate / 60) + 'm ago'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={() => callResponder(worker)}
                          disabled={!!activeRequest}
                          className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                          size="sm"
                        >
                          <PhoneCall className="h-4 w-4 mr-1" />
                          Call Responder
                        </Button>
                        <a
                          href={`https://maps.google.com/?q=${worker.location_lat},${worker.location_lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center"
                        >
                          <Navigation className="h-4 w-4" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick-Dial Emergency Service FAB */}
        <div className="fixed left-6 bottom-24 z-50 flex flex-col gap-3 group md:hidden">
          <button
            onClick={() => handleEmergencyCall('991')}
            className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            title="Police (991)"
          >
            <Shield size={20} />
            <span className="text-xs font-bold">991</span>
          </button>
          <button
            onClick={() => handleEmergencyCall('939')}
            className="bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2"
            title="Ambulance (939)"
          >
            <Activity size={20} />
            <span className="text-xs font-bold">939</span>
          </button>
          <button
            onClick={() => handleEmergencyCall('912')}
            className="bg-orange-600 text-white p-3 rounded-full shadow-lg hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
            title="Fire (912)"
          >
            <Flame size={20} />
            <span className="text-xs font-bold">912</span>
          </button>
        </div>
      </div>

      {/* Emergency Stations */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Hospital className="h-5 w-5 text-red-600" />
          Emergency Stations
        </h2>

        {isLoadingLocation ? (
          <div className="text-center py-8 bg-white rounded-xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading location...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emergencyStations.map((station) => (
              <Card key={station.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className={`p-2 rounded-full ${getStationColor(station.type)}`}>
                        {getStationIcon(station.type)}
                      </div>
                      {station.name}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {station.distance.toFixed(1)} km
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <p className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {station.phone}
                      </p>
                      <p className="mt-1 text-green-600 font-medium">
                        Response: {station.responseTime}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleEmergencyCall(station.phone)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                      size="sm"
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  {selectedWorker ? 'Request This Responder' : 'Request Emergency Help'}
                </h2>
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setSelectedWorker(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Selected Worker Info */}
              {selectedWorker && (
                <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{
                        background: `${EMERGENCY_CATEGORIES.find(c => c.key === selectedWorker.category)?.color}20`
                      }}
                    >
                      {EMERGENCY_CATEGORIES.find(c => c.key === selectedWorker.category)?.icon || '👷'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {selectedWorker.profiles?.full_name || 'Responder'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {EMERGENCY_CATEGORIES.find(c => c.key === selectedWorker.category)?.label} • {selectedWorker.distance?.toFixed(1)}km away
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Category Selection (only if no worker selected) */}
              {!selectedWorker && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Emergency Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {EMERGENCY_CATEGORIES.map((cat) => (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setSelectedCategory(cat.key)}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${selectedCategory === cat.key
                          ? 'border-orange-500 bg-orange-50 scale-105'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="text-2xl mb-1">{cat.icon}</div>
                        <div className="font-medium text-sm">{cat.label}</div>
                        <div className="text-xs text-gray-500">{cat.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Details Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe your emergency
                </label>
                <textarea
                  value={requestDetails}
                  onChange={(e) => setRequestDetails(e.target.value)}
                  placeholder="What's happening? Any specific details..."
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              {/* Location Info */}
              <div className="mb-6 p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-2 text-blue-800">
                  <MapPin className="h-5 w-5" />
                  <span className="font-medium">Your Location</span>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  📍 {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </p>
              </div>

              {/* Submit Button */}
              <Button
                onClick={() => createEmergencyRequest()}
                disabled={(!selectedCategory && !selectedWorker) || isSubmitting}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white py-6 text-lg font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Sending Request...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Send Emergency Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Assistant Modal */}
      <EmergencyAssistant
        isOpen={showEmergencyAssistant}
        onClose={() => setShowEmergencyAssistant(false)}
        userLocation={userLocation}
      />

      {/* First Aid Chatbot Modal */}
      {showFirstAidBot && (
        <FirstAidChatbot
          isOpen={showFirstAidBot}
          onClose={() => setShowFirstAidBot(false)}
        />
      )}
    </div>
  );
};

export default Emergency;
