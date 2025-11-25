import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { EmergencyAssistant } from '@/components/EmergencyAssistant';
import { FirstAidChatbot } from '@/components/FirstAidChatbot';
import { MapView } from '@/components/MapView';
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
  Navigation
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

export const Emergency: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const [userLocation, setUserLocation] = useState({ lat: 9.0320, lng: 38.7469 });
  const [emergencyStations, setEmergencyStations] = useState<EmergencyStation[]>([]);
  const [showEmergencyAssistant, setShowEmergencyAssistant] = useState(false);
  const [showFirstAidBot, setShowFirstAidBot] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);

  // Get user's real-time location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
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
          maximumAge: 300000
        }
      );
    } else {
      setIsLoadingLocation(false);
      generateNearbyEmergencyStations(userLocation);
    }
  }, []);

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const generateNearbyEmergencyStations = (location: { lat: number; lng: number }) => {
    // Generate mock emergency stations around the user's location
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
      },
      {
        id: '5',
        name: language === 'am' ? 'የልብ ህክምና ሆስፒታል' : 'Cardiac Emergency Hospital',
        type: 'hospital',
        location: { lat: location.lat + 0.025, lng: location.lng - 0.008 },
        distance: 0,
        phone: '+251-11-234-5678',
        isOpen: true,
        responseTime: '8-12 min'
      }
    ];

    // Calculate actual distances
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
      case 'hospital':
        return <Hospital className="h-5 w-5" />;
      case 'police':
        return <Shield className="h-5 w-5" />;
      case 'fire':
        return <Flame className="h-5 w-5" />;
      case 'ambulance':
        return <Car className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getStationColor = (type: string) => {
    switch (type) {
      case 'hospital':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'police':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'fire':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'ambulance':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const createEmergencyRequest = async () => {
    try {
      const { data: session } = await supabase.auth.getUser();
      const userId = session.user?.id;
      if (!userId) {
        alert('Please sign in to request help.');
        return;
      }
      const { error } = await supabase
        .from('emergency_requests' as any)
        .insert({
          user_id: userId,
          status: 'pending',
          category: 'general',
          details: 'Emergency assistance requested from Emergency page',
          user_location_lat: userLocation.lat,
          user_location_lng: userLocation.lng,
        });
      if (error) throw error;
      alert('Emergency request sent. A responder will accept shortly.');
    } catch (e) {
      console.error(e);
      alert('Failed to send request. Please try again.');
    }
  };

  const handleEmergencyCall = (phone: string) => {
    window.open(`tel:${phone}`);
  };

  const transformStationsForMap = () => {
    return emergencyStations.map(station => ({
      id: station.id,
      title: station.name,
      description: `${t('distance')}: ${station.distance.toFixed(1)}km`,
      price: 0,
      category: station.type,
      provider: station.name,
      rating: 5,
      distance: station.distance,
      image: '/placeholder.svg',
      location: station.location,
      user_id: station.id,
      profiles: {
        full_name: station.name,
        rating: 5,
        profile_image_url: '/placeholder.svg'
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 pb-20">
      {/* Header */}
      <div className="bg-red-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8" />
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
                className="text-white hover:bg-red-700"
              >
                <Globe className="h-4 w-4 mr-2" />
                {language === 'en' ? 'አማርኛ' : 'English'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Alert */}
      <div className="container mx-auto px-4 py-4">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 font-medium">
            🚨 {t('emergencyNotified')}
          </AlertDescription>
        </Alert>
      </div>

      {/* Quick Actions */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Button
            onClick={() => setShowEmergencyAssistant(true)}
            className="h-20 bg-red-600 hover:bg-red-700 text-white flex-col gap-2 emergency-pulse"
          >
            <AlertTriangle className="h-6 w-6" />
            <span className="text-sm font-medium">{t('emergencyAssistant')}</span>
          </Button>
          
          <Button
            onClick={() => setShowFirstAidBot(true)}
            className="h-20 bg-blue-600 hover:bg-blue-700 text-white flex-col gap-2"
          >
            <Bot className="h-6 w-6" />
            <span className="text-sm font-medium">{t('firstAidBot')}</span>
          </Button>

          <Button
            onClick={createEmergencyRequest}
            className="h-20 bg-indigo-600 hover:bg-indigo-700 text-white flex-col gap-2"
          >
            <AlertTriangle className="h-6 w-6" />
            <span className="text-sm font-medium">Request Help</span>
          </Button>

          <Button
            onClick={() => handleEmergencyCall('911')}
            className="h-20 bg-orange-600 hover:bg-orange-700 text-white flex-col gap-2"
          >
            <Phone className="h-6 w-6" />
            <span className="text-sm font-medium">{t('call911')}</span>
          </Button>

          <Button
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                  const url = `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;
                  window.open(url, '_blank');
                });
              }
            }}
            className="h-20 bg-green-600 hover:bg-green-700 text-white flex-col gap-2"
          >
            <Navigation className="h-6 w-6" />
            <span className="text-sm font-medium">{t('shareLocation')}</span>
          </Button>
        </div>

        {/* Emergency Stations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Stations List */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <MapPin className="h-6 w-6 text-red-600" />
              {t('emergencyStations')}
            </h2>

            {isLoadingLocation ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading location...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {emergencyStations.map((station) => (
                  <Card key={station.id} className="hover:shadow-lg transition-shadow">
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

          {/* Map View */}
          <div className="w-full h-72 my-4 relative z-0">
            <MapView
              services={transformStationsForMap()}
              userLocation={userLocation}
              distanceFilter={20}
            />
          </div>
        </div>
      </div>

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