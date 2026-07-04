import React, { useEffect, useMemo, useState } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { useRealTimeAds } from '@/hooks/useRealTimeAds';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = { lat: 9.032, lng: 38.7469 };

const emergencyStations = [
  { id: 'e1', name: 'Tikur Anbessa Hospital', type: 'hospital', lat: 9.0366, lng: 38.7639 },
  { id: 'e2', name: 'Federal Police HQ', type: 'police', lat: 9.03, lng: 38.74 },
  { id: 'e3', name: 'Addis Fire & Emergency', type: 'fire', lat: 9.025, lng: 38.75 },
  { id: 'e4', name: 'Ambulance Service Center', type: 'ambulance', lat: 9.018, lng: 38.758 },
];

const stationIcon = (type: string) => {
  const icons: Record<string, string> = {
    hospital: '🏥',
    police: '🚔',
    fire: '🚒',
    ambulance: '🚑',
  };
  return icons[type] || '📌';
};

const categoryColors: Record<string, string> = {
  Properties: '#8B5CF6',
  'Community Help': '#10B981',
  'Safety Alert': '#EF4444',
};

const Map3D: React.FC = () => {
  const navigate = useNavigate();
  const { ads } = useRealTimeAds();
  const [center, setCenter] = useState(defaultCenter);
  const [selectedAd, setSelectedAd] = useState<any>(null);
  const googleMapsApiKey = 'AIzaSyBs3GqItt4UlMnRFZEkXNWZxQUkdYxOeRk';

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  const adMarkers = useMemo(() => {
    return (ads || []).filter((ad: any) => ad.location_lat && ad.location_lng).map((ad: any) => ({
      id: ad.id,
      lat: ad.location_lat,
      lng: ad.location_lng,
      title: ad.title,
      price: ad.price,
      category: ad.category,
    }));
  }, [ads]);

  const stationMarkers = emergencyStations.map(s => ({
    id: s.id,
    lat: s.lat,
    lng: s.lng,
    name: s.name,
    type: s.type,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 overflow-x-hidden">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          ← Back
        </Button>
        <div className="text-center font-semibold">Explore Map</div>
        <div />
      </div>

      <div className="container mx-auto px-4 pb-6">
        <div className="w-full h-[70vh] rounded-xl overflow-hidden shadow relative">
          <LoadScript googleMapsApiKey={googleMapsApiKey}>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={12}
              options={{
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
              }}
            >
              {adMarkers.map((ad: any) => (
                <Marker
                  key={ad.id}
                  position={{ lat: ad.lat, lng: ad.lng }}
                  icon={{
                    path: window.google?.maps?.SymbolPath?.CIRCLE || 1,
                    scale: 8,
                    fillColor: categoryColors[ad.category] || '#6366F1',
                    fillOpacity: 0.9,
                    strokeColor: '#fff',
                    strokeWeight: 2,
                  }}
                  onClick={() => setSelectedAd(ad)}
                />
              ))}

              {stationMarkers.map((s) => (
                <Marker
                  key={s.id}
                  position={{ lat: s.lat, lng: s.lng }}
                  label={{ text: stationIcon(s.type), fontSize: '16px' }}
                  title={s.name}
                />
              ))}

              {selectedAd && (
                <InfoWindow
                  position={{ lat: selectedAd.lat, lng: selectedAd.lng }}
                  onCloseClick={() => setSelectedAd(null)}
                >
                  <div className="text-sm max-w-[200px]">
                    <div className="font-semibold text-gray-800">{selectedAd.title}</div>
                    <div className="text-orange-600 font-bold mt-1">
                      {selectedAd.price ? `${selectedAd.price} ETB` : 'Free'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{selectedAd.category}</div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-6">
        <div className="flex flex-wrap gap-4 justify-center text-sm">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ background: '#8B5CF6' }} />
            <span>Properties</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ background: '#10B981' }} />
            <span>Community Help</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ background: '#EF4444' }} />
            <span>Safety Alert</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-base">🏥🚔🚒🚑</span>
            <span>Emergency Stations</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map3D;
