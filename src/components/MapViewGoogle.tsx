import React, { useEffect, useRef, useState } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import { useLocation } from '@/contexts/LocationContext';
import { calculateDistanceKm } from '@/lib/utils';
import { CRIME_HOTSPOTS, getSeverityColor, getSeverityOpacity, getSeverityLabel } from '@/hooks/crimeData';

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  provider: string;
  rating: number;
  distance: number;
  image: string;
  location: { lat: number; lng: number };
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number;
  is_furnished?: boolean;
  listing_type?: string;
}

interface MapViewProps {
  services: Service[];
  userLocation: { lat: number; lng: number };
  distanceFilter: number;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const baseEmergencyLocations = [
  { type: 'Hospital', name: 'Tikur Anbessa Hospital', lat: 9.0366, lng: 38.7639, icon: '🏥', phone: '+251-11-551-7211' },
  { type: 'Hospital', name: 'Black Lion Hospital', lat: 9.0415, lng: 38.7614, icon: '🏥', phone: '+251-11-553-5370' },
  { type: 'Hospital', name: 'Bethzatha General Hospital', lat: 9.0200, lng: 38.7800, icon: '🏥', phone: '+251-11-661-5544' },
  { type: 'Hospital', name: 'Myungsung Christian Medical Center', lat: 8.9950, lng: 38.7450, icon: '🏥', phone: '+251-11-416-2000' },
  { type: 'Clinic', name: 'Bethany Medical Clinic', lat: 9.0180, lng: 38.7580, icon: '🏥', phone: '+251-11-551-3344' },
  { type: 'Clinic', name: 'Family Care Clinic', lat: 9.0080, lng: 38.7680, icon: '🏥', phone: '+251-11-662-1122' },
  { type: 'Clinic', name: 'Addis Medical Clinic', lat: 8.9980, lng: 38.7980, icon: '🏥', phone: '+251-11-661-9988' },
  { type: 'Clinic', name: 'Bole Medical Center', lat: 8.9920, lng: 38.8080, icon: '🏥', phone: '+251-11-661-7755' },
  { type: 'Police', name: 'Federal Police HQ', lat: 9.0300, lng: 38.7400, icon: '🚔', phone: '+251-11-551-8877' },
  { type: 'Police', name: 'Bole Police Station', lat: 8.9950, lng: 38.8100, icon: '🚔', phone: '+251-11-661-2400' },
  { type: 'Police', name: 'Kirkos Police Station', lat: 9.0100, lng: 38.7550, icon: '🚔', phone: '+251-11-551-2400' },
  { type: 'Police', name: 'Lideta Police Station', lat: 9.0350, lng: 38.7350, icon: '🚔', phone: '+251-11-551-6677' },
  { type: 'Fire Station', name: 'Addis Fire & Emergency Service', lat: 9.0250, lng: 38.7500, icon: '🚒', phone: '+251-11-551-1311' },
  { type: 'Fire Station', name: 'Bole Fire Station', lat: 8.9950, lng: 38.8100, icon: '🚒', phone: '+251-11-661-5544' },
  { type: 'Pharmacy', name: 'Bethany Pharmacy', lat: 9.0150, lng: 38.7600, icon: '💊', phone: '+251-11-551-3344' },
  { type: 'Pharmacy', name: 'Hayat Pharmacy', lat: 9.0050, lng: 38.7750, icon: '💊', phone: '+251-11-662-2211' },
  { type: 'Pharmacy', name: 'Bole Pharmacy', lat: 8.9980, lng: 38.8050, icon: '💊', phone: '+251-11-661-7788' },
  { type: 'Pharmacy', name: 'CMC Pharmacy', lat: 9.0080, lng: 38.7850, icon: '💊', phone: '+251-11-662-3366' },
  { type: 'Pharmacy', name: 'Piazza Pharmacy', lat: 9.0380, lng: 38.7480, icon: '💊', phone: '+251-11-551-4455' },
  { type: 'Pharmacy', name: 'Merkato Pharmacy', lat: 9.0120, lng: 38.7520, icon: '💊', phone: '+251-11-551-8899' },
  { type: 'Emergency', name: 'Ethiopian Red Cross', lat: 9.0100, lng: 38.7650, icon: '🆘', phone: '+251-11-551-5393' },
  { type: 'Emergency', name: 'Ambulance Service Center', lat: 9.0180, lng: 38.7580, icon: '🚑', phone: '+251-11-551-9393' },
];

const getCategoryIcon = (cat: string) => {
  if (cat === 'Properties') return '🏠';
  if (cat === 'Community Help') return '🤝';
  if (cat === 'Safety Alert') return '⚠️';
  return '📍';
};

const getCategoryColor = (cat: string) => {
  if (cat === 'Properties') return '#8b5cf6';
  if (cat === 'Community Help') return '#10b981';
  if (cat === 'Safety Alert') return '#dc2626';
  return '#f97316';
};

export const MapView: React.FC<MapViewProps> = ({ services, userLocation: initialUserLocation, distanceFilter }) => {
  const { location: contextLocation, loading: locationLoading, error: locationError } = useLocation();
  const currentLocation = contextLocation || initialUserLocation;
  const [isTracking] = useState(!!contextLocation);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedEmergency, setSelectedEmergency] = useState<any | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const handleEmergencyCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const getNearbyEmergencyLocations = (centerLat: number, centerLng: number) => {
    return baseEmergencyLocations.filter(loc => {
      const distance = calculateDistanceKm(centerLat, centerLng, loc.lat, loc.lng);
      return distance <= 5;
    });
  };

  const nearbyEmergencies = getNearbyEmergencyLocations(currentLocation.lat, currentLocation.lng);

  const getServiceMarkerIcon = (service: Service) =>
    `data:image/svg+xml,${encodeURIComponent(`<svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="18" fill="${getCategoryColor(service.category)}" stroke="white" stroke-width="3"/>
      <text x="22" y="26" text-anchor="middle" font-size="16">${getCategoryIcon(service.category)}</text>
      <circle cx="34" cy="34" r="6" fill="#10b981" stroke="white" stroke-width="2"/>
    </svg>`)}`;

  const getUserMarkerIcon = () =>
    `data:image/svg+xml,${encodeURIComponent(`<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8" fill="${isTracking ? '#10b981' : '#ef4444'}" stroke="white" stroke-width="3"/>
    </svg>`)}`;

  const getEmergencyMarkerIcon = (loc: any) =>
    `data:image/svg+xml,${encodeURIComponent(`<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="11" fill="#dc2626" stroke="white" stroke-width="2"/>
      <text x="14" y="18" text-anchor="middle" font-size="12">${loc.icon}</text>
    </svg>`)}`;

  const buildServiceInfoContent = (service: Service) => {
    const propertyInfo = service.category === 'Properties' ? `
      <div style="display:flex;gap:8px;margin:8px 0;padding:6px;background:#f5f3ff;border-radius:8px;font-size:11px;color:#5b21b6;font-weight:700;border:1px solid #ddd6fe;">
        <span>🛏️ ${service.bedrooms || 0}</span>
        <span>🚿 ${service.bathrooms || 0}</span>
        <span>📐 ${service.area_sqm || 0}m²</span>
      </div>
    ` : '';
    return `
      <div style="min-width:220px;font-family:inherit;">
        <div style="position:relative;">
          <img src="${service.image}" style="width:100%;height:120px;object-fit:cover;border-radius:12px 12px 0 0;" />
          <div style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);color:white;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
            ${service.category}
          </div>
        </div>
        <div style="padding:12px;background:white;">
          <strong style="display:block;color:#1e293b;font-size:16px;margin-bottom:4px;">${service.title}</strong>
          <div style="display:flex;align-items:center;gap:4px;margin-bottom:8px;">
            <span style="color:#f59e0b;font-size:12px;">★</span>
            <span style="font-size:12px;color:#64748b;font-weight:600;">${service.rating.toFixed(1)}</span>
            <span style="margin-left:auto;font-size:11px;color:#10b981;font-weight:700;">● ACTIVE NOW</span>
          </div>
          ${propertyInfo}
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:12px;border-top:1px solid #f1f5f9;padding-top:8px;">
            <span style="font-size:18px;font-weight:900;color:#f97316;">ETB ${service.price.toLocaleString()}</span>
            <span style="font-size:11px;color:#94a3b8;font-weight:600;">${service.distance.toFixed(1)}km</span>
          </div>
        </div>
      </div>
    `;
  };

  const [showCrimeLayer, setShowCrimeLayer] = useState(true);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Crime zone legend overlay */}
      {showCrimeLayer && (
        <div style={{
          position: 'absolute', bottom: 12, left: 12, zIndex: 10,
          background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: '8px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: 11,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{ fontWeight: 700, color: '#374151', marginBottom: 2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Crime Heat Zones
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
            <span style={{ color: '#6b7280' }}>High</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
            <span style={{ color: '#6b7280' }}>Moderate</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#eab308', display: 'inline-block' }} />
            <span style={{ color: '#6b7280' }}>Low</span>
          </div>
        </div>
      )}
      <LoadScript googleMapsApiKey="AIzaSyBs3GqItt4UlMnRFZEkXNWZxQUkdYxOeRk">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={{ lat: currentLocation.lat, lng: currentLocation.lng }}
          zoom={15}
          onLoad={(map) => { mapRef.current = map; }}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          {/* Distance circle */}
          <Circle
            center={{ lat: currentLocation.lat, lng: currentLocation.lng }}
            radius={distanceFilter * 1000}
            options={{
              fillColor: '#f97316',
              fillOpacity: 0.1,
              strokeColor: '#f97316',
              strokeWeight: 2,
              strokeOpacity: 0.5,
            }}
          />

          {/* User location marker */}
          <Marker
            position={{ lat: currentLocation.lat, lng: currentLocation.lng }}
            icon={getUserMarkerIcon()}
            title={isTracking ? 'Live Location' : 'Current Location'}
          />

          {/* Crime heat hotspots */}
          {CRIME_HOTSPOTS.map((spot) => (
            <React.Fragment key={spot.id}>
              <Circle
                center={{ lat: spot.lat, lng: spot.lng }}
                radius={spot.radius}
                options={{
                  fillColor: getSeverityColor(spot.severity),
                  fillOpacity: getSeverityOpacity(spot.severity),
                  strokeColor: getSeverityColor(spot.severity),
                  strokeWeight: 2,
                  strokeOpacity: 0.4,
                }}
              />
              <Marker
                position={{ lat: spot.lat, lng: spot.lng }}
                icon={{
                  path: window.google?.maps?.SymbolPath?.CIRCLE || 1,
                  scale: 0,
                }}
                title={`${getSeverityLabel(spot.severity)} — ${spot.incidents} incidents (${spot.type})`}
              />
            </React.Fragment>
          ))}

          {/* Service markers */}
          {services.map((service) => (
            <Marker
              key={service.id}
              position={{ lat: service.location.lat, lng: service.location.lng }}
              icon={getServiceMarkerIcon(service)}
              onClick={() => { setSelectedService(service); setSelectedEmergency(null); }}
            />
          ))}

          {/* Service InfoWindow */}
          {selectedService && (
            <InfoWindow
              position={{ lat: selectedService.location.lat, lng: selectedService.location.lng }}
              onCloseClick={() => setSelectedService(null)}
              options={{ pixelOffset: { width: 0, height: -22 } as any }}
            >
              <div dangerouslySetInnerHTML={{ __html: buildServiceInfoContent(selectedService) }} />
            </InfoWindow>
          )}

          {/* Emergency markers */}
          {nearbyEmergencies.map((loc, i) => (
            <Marker
              key={`emergency-${i}`}
              position={{ lat: loc.lat, lng: loc.lng }}
              icon={getEmergencyMarkerIcon(loc)}
              onClick={() => { setSelectedEmergency(loc); setSelectedService(null); }}
            />
          ))}

          {/* Emergency InfoWindow */}
          {selectedEmergency && (
            <InfoWindow
              position={{ lat: selectedEmergency.lat, lng: selectedEmergency.lng }}
              onCloseClick={() => setSelectedEmergency(null)}
            >
              <div style={{ textAlign: 'center', maxWidth: 200 }}>
                <strong>{selectedEmergency.name}</strong><br />
                <small>{selectedEmergency.type}</small><br />
                <button
                  onClick={() => handleEmergencyCall(selectedEmergency.phone)}
                  style={{ background: '#16a34a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, marginTop: 8, cursor: 'pointer', fontSize: 12 }}
                >
                  📞 Call {selectedEmergency.phone}
                </button>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
};
