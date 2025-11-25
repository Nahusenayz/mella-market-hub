
import React, { useState, useEffect } from 'react';
import { Phone, MapPin, X, Navigation } from 'lucide-react';
import { useLocation } from '@/contexts/LocationContext';

interface SearchHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isWorkerMode: boolean;
}

interface EmergencyStation {
  id: string;
  type: string;
  name: string;
  lat: number;
  lng: number;
  icon: string;
  phone: string;
  address: string;
  distance?: number;
}

export const SearchHero: React.FC<SearchHeroProps> = ({
  searchQuery,
  onSearchChange,
  isWorkerMode
}) => {
  const [selectedEmergencyType, setSelectedEmergencyType] = useState<string | null>(null);
  const { location: contextLocation, permissionStatus } = useLocation();

  // Use context location or fallback to Addis Ababa
  const userLocation = contextLocation || { lat: 9.0320, lng: 38.7469 };
  const [nearestStations, setNearestStations] = useState<EmergencyStation[]>([]);
  const isLocationTracking = permissionStatus === 'granted';

  // Emergency stations in Addis Ababa
  const emergencyStations: EmergencyStation[] = [
    // Police Stations
    {
      id: '1', type: 'Police', name: 'Federal Police HQ',
      lat: 9.0300, lng: 38.7400, icon: '🚔',
      phone: '+251-11-551-8877', address: 'Arada, Addis Ababa'
    },
    {
      id: '2', type: 'Police', name: 'Bole Police Station',
      lat: 8.9950, lng: 38.8100, icon: '🚔',
      phone: '+251-11-661-2400', address: 'Bole, Addis Ababa'
    },
    {
      id: '3', type: 'Police', name: 'Kirkos Police Station',
      lat: 9.0100, lng: 38.7550, icon: '🚔',
      phone: '+251-11-551-2400', address: 'Kirkos, Addis Ababa'
    },

    // Traffic Police
    {
      id: '4', type: 'Traffic', name: 'Traffic Control Center',
      lat: 9.0200, lng: 38.7450, icon: '🚦',
      phone: '+251-11-551-9900', address: 'Mexico, Addis Ababa'
    },
    {
      id: '5', type: 'Traffic', name: 'Bole Traffic Police',
      lat: 8.9920, lng: 38.8120, icon: '🚦',
      phone: '+251-11-661-8899', address: 'Bole, Addis Ababa'
    },
    {
      id: '6', type: 'Traffic', name: 'Piazza Traffic Unit',
      lat: 9.0380, lng: 38.7480, icon: '🚦',
      phone: '+251-11-551-7700', address: 'Piazza, Addis Ababa'
    },

    // Ambulance/Hospitals
    {
      id: '7', type: 'Ambulance', name: 'Tikur Anbessa Hospital',
      lat: 9.0366, lng: 38.7639, icon: '🚑',
      phone: '+251-11-551-7211', address: 'Lideta, Addis Ababa'
    },
    {
      id: '8', type: 'Ambulance', name: 'Black Lion Hospital',
      lat: 9.0415, lng: 38.7614, icon: '🚑',
      phone: '+251-11-553-5370', address: 'Gulele, Addis Ababa'
    },
    {
      id: '9', type: 'Ambulance', name: 'Bethzatha General Hospital',
      lat: 9.0200, lng: 38.7800, icon: '🚑',
      phone: '+251-11-661-5544', address: 'Bole, Addis Ababa'
    },
    {
      id: '10', type: 'Ambulance', name: 'Ethiopian Red Cross Ambulance',
      lat: 9.0100, lng: 38.7650, icon: '🚑',
      phone: '+251-11-551-5393', address: 'Arat Kilo, Addis Ababa'
    },

    // Fire Stations
    {
      id: '11', type: 'Fire Station', name: 'Addis Fire & Emergency Service',
      lat: 9.0250, lng: 38.7500, icon: '🚒',
      phone: '+251-11-551-1311', address: 'Piazza, Addis Ababa'
    },
    {
      id: '12', type: 'Fire Station', name: 'Bole Fire Station',
      lat: 8.9950, lng: 38.8100, icon: '🚒',
      phone: '+251-11-661-5544', address: 'Bole, Addis Ababa'
    },
    {
      id: '13', type: 'Fire Station', name: 'Gulele Fire Station',
      lat: 9.0450, lng: 38.7350, icon: '🚒',
      phone: '+251-11-551-6677', address: 'Gulele, Addis Ababa'
    }
  ];

  const emergencyTypes = [
    { type: 'Police', icon: '🚔', color: 'bg-blue-600 hover:bg-blue-700', label: 'Police' },
    { type: 'Traffic', icon: '🚦', color: 'bg-yellow-600 hover:bg-yellow-700', label: 'Traffic Police' },
    { type: 'Ambulance', icon: '🚑', color: 'bg-red-600 hover:bg-red-700', label: 'Ambulance' },
    { type: 'Fire Station', icon: '🚒', color: 'bg-orange-600 hover:bg-orange-700', label: 'Fire Station' }
  ];

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };



  // Update nearest stations when emergency type is selected or location changes
  useEffect(() => {
    if (selectedEmergencyType) {
      const filteredStations = emergencyStations
        .filter(station => station.type === selectedEmergencyType)
        .map(station => ({
          ...station,
          distance: calculateDistance(userLocation.lat, userLocation.lng, station.lat, station.lng)
        }))
        .filter(station => (station.distance || 0) <= 5) // Only show stations within 5km
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, 5); // Show top 5 nearest

      setNearestStations(filteredStations);
    }
  }, [selectedEmergencyType, userLocation]);

  const handleEmergencyTypeSelect = (type: string) => {
    setSelectedEmergencyType(type);
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleNavigate = (station: EmergencyStation) => {
    const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${station.lat},${station.lng}`;
    window.open(url, '_blank');
  };

  const handleBack = () => {
    setSelectedEmergencyType(null);
    setNearestStations([]);
  };

  if (isWorkerMode) {
    return (
      <div className="bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
              Offer Your Services
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              Connect with customers in your area and grow your business
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                <MapPin size={16} />
                <span>Local Customers</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                <Phone size={16} />
                <span>Direct Contact</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white min-h-[60vh]">
      <div className="container mx-auto px-4 py-8">
        {!selectedEmergencyType ? (
          // Emergency Type Selection
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-4xl">🚨</span>
              <h1 className="text-3xl md:text-5xl font-bold animate-fade-in">
                Emergency Services
              </h1>
            </div>
            <p className="text-lg md:text-xl mb-8 opacity-90">
              Quick access to nearest emergency services in your area
            </p>

            {/* Location Status */}
            <div className="mb-8 bg-white/10 backdrop-blur-sm rounded-2xl p-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 text-sm md:text-base">
                <div className={`w-3 h-3 rounded-full ${isLocationTracking ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                <MapPin size={20} />
                <span>{isLocationTracking ? 'Using your live location for accurate results' : 'Using default location'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
              {emergencyTypes.map((emergency) => (
                <button
                  key={emergency.type}
                  onClick={() => handleEmergencyTypeSelect(emergency.type)}
                  className={`${emergency.color} text-white p-6 md:p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex flex-col items-center gap-3 border-2 border-white/20`}
                >
                  <span className="text-4xl md:text-5xl">{emergency.icon}</span>
                  <span className="text-sm md:text-base font-bold">{emergency.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Nearest Stations List
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={handleBack}
                className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{emergencyTypes.find(e => e.type === selectedEmergencyType)?.icon}</span>
                <h2 className="text-2xl md:text-3xl font-bold">
                  Nearest {selectedEmergencyType} Stations
                </h2>
              </div>
            </div>

            {/* Location Status */}
            <div className="mb-6 bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center justify-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isLocationTracking ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                <span>{isLocationTracking ? 'Showing stations near your live location' : 'Showing stations near default location'}</span>
              </div>
            </div>

            <div className="space-y-4">
              {nearestStations.map((station, index) => (
                <div key={station.id} className="bg-white/95 text-gray-800 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <div className="bg-red-100 p-3 rounded-full">
                      <span className="text-2xl">{station.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 mb-1">{station.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{station.address}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin size={16} className="text-red-500" />
                            <span className="font-medium text-red-600">
                              {station.distance ? `${station.distance.toFixed(1)} km away` : 'Distance calculating...'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold mb-2">
                            #{index + 1} CLOSEST
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => handleCall(station.phone)}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors flex-1"
                        >
                          <Phone size={20} />
                          <span className="hidden sm:inline">Call Now</span>
                          <span className="sm:hidden">Call</span>
                        </button>
                        <button
                          onClick={() => handleNavigate(station)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors flex-1"
                        >
                          <Navigation size={20} />
                          <span className="hidden sm:inline">Navigate</span>
                          <span className="sm:hidden">Go</span>
                        </button>
                      </div>
                      <div className="mt-3 bg-gray-100 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone size={14} />
                          <span className="font-mono">{station.phone}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {nearestStations.length === 0 && (
              <div className="text-center py-12">
                <div className="text-white/80 mb-4">
                  <span className="text-4xl mb-2 block">🔍</span>
                  <p>No {selectedEmergencyType.toLowerCase()} stations found within 5km of your location.</p>
                  <p className="text-sm mt-2 opacity-75">Try moving closer to the city center or check your location settings.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
