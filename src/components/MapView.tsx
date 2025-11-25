import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocation } from '@/contexts/LocationContext';

// Fix for default markers in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
}

interface MapViewProps {
  services: Service[];
  userLocation: { lat: number; lng: number };
  distanceFilter: number;
}

export const MapView: React.FC<MapViewProps> = ({ services, userLocation: initialUserLocation, distanceFilter }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersGroup = useRef<L.LayerGroup | null>(null);
  const userMarker = useRef<L.Marker | null>(null);
  const { location: contextLocation, loading: locationLoading, error: locationError, permissionStatus } = useLocation();

  // Use context location if available, otherwise use prop
  const currentLocation = contextLocation || initialUserLocation;
  const [isTracking, setIsTracking] = useState(false);
  const [displayError, setDisplayError] = useState<string>('');

  // Base emergency locations in Addis Ababa with actual phone numbers
  const baseEmergencyLocations = [
    // Hospitals
    {
      type: 'Hospital',
      name: 'Tikur Anbessa Hospital',
      lat: 9.0366,
      lng: 38.7639,
      icon: '🏥',
      phone: '+251-11-551-7211'
    },
    {
      type: 'Hospital',
      name: 'Black Lion Hospital',
      lat: 9.0415,
      lng: 38.7614,
      icon: '🏥',
      phone: '+251-11-553-5370'
    },
    {
      type: 'Hospital',
      name: 'Bethzatha General Hospital',
      lat: 9.0200,
      lng: 38.7800,
      icon: '🏥',
      phone: '+251-11-661-5544'
    },
    {
      type: 'Hospital',
      name: 'Myungsung Christian Medical Center',
      lat: 8.9950,
      lng: 38.7450,
      icon: '🏥',
      phone: '+251-11-416-2000'
    },

    // Clinics
    {
      type: 'Clinic',
      name: 'Bethany Medical Clinic',
      lat: 9.0180,
      lng: 38.7580,
      icon: '🏥',
      phone: '+251-11-551-3344'
    },
    {
      type: 'Clinic',
      name: 'Family Care Clinic',
      lat: 9.0080,
      lng: 38.7680,
      icon: '🏥',
      phone: '+251-11-662-1122'
    },
    {
      type: 'Clinic',
      name: 'Addis Medical Clinic',
      lat: 8.9980,
      lng: 38.7980,
      icon: '🏥',
      phone: '+251-11-661-9988'
    },
    {
      type: 'Clinic',
      name: 'Bole Medical Center',
      lat: 8.9920,
      lng: 38.8080,
      icon: '🏥',
      phone: '+251-11-661-7755'
    },

    // Police Stations
    {
      type: 'Police',
      name: 'Federal Police HQ',
      lat: 9.0300,
      lng: 38.7400,
      icon: '🚔',
      phone: '+251-11-551-8877'
    },
    {
      type: 'Police',
      name: 'Bole Police Station',
      lat: 8.9950,
      lng: 38.8100,
      icon: '🚔',
      phone: '+251-11-661-2400'
    },
    {
      type: 'Police',
      name: 'Kirkos Police Station',
      lat: 9.0100,
      lng: 38.7550,
      icon: '🚔',
      phone: '+251-11-551-2400'
    },
    {
      type: 'Police',
      name: 'Lideta Police Station',
      lat: 9.0350,
      lng: 38.7350,
      icon: '🚔',
      phone: '+251-11-551-6677'
    },

    // Fire Stations
    {
      type: 'Fire Station',
      name: 'Addis Fire & Emergency Service',
      lat: 9.0250,
      lng: 38.7500,
      icon: '🚒',
      phone: '+251-11-551-1311'
    },
    {
      type: 'Fire Station',
      name: 'Bole Fire Station',
      lat: 8.9950,
      lng: 38.8100,
      icon: '🚒',
      phone: '+251-11-661-5544'
    },

    // Pharmacies
    {
      type: 'Pharmacy',
      name: 'Bethany Pharmacy',
      lat: 9.0150,
      lng: 38.7600,
      icon: '💊',
      phone: '+251-11-551-3344'
    },
    {
      type: 'Pharmacy',
      name: 'Hayat Pharmacy',
      lat: 9.0050,
      lng: 38.7750,
      icon: '💊',
      phone: '+251-11-662-2211'
    },
    {
      type: 'Pharmacy',
      name: 'Bole Pharmacy',
      lat: 8.9980,
      lng: 38.8050,
      icon: '💊',
      phone: '+251-11-661-7788'
    },
    {
      type: 'Pharmacy',
      name: 'CMC Pharmacy',
      lat: 9.0080,
      lng: 38.7850,
      icon: '💊',
      phone: '+251-11-662-3366'
    },
    {
      type: 'Pharmacy',
      name: 'Piazza Pharmacy',
      lat: 9.0380,
      lng: 38.7480,
      icon: '💊',
      phone: '+251-11-551-4455'
    },
    {
      type: 'Pharmacy',
      name: 'Merkato Pharmacy',
      lat: 9.0120,
      lng: 38.7520,
      icon: '💊',
      phone: '+251-11-551-8899'
    },

    // Emergency Services
    {
      type: 'Emergency',
      name: 'Ethiopian Red Cross',
      lat: 9.0100,
      lng: 38.7650,
      icon: '🆘',
      phone: '+251-11-551-5393'
    },
    {
      type: 'Emergency',
      name: 'Ambulance Service Center',
      lat: 9.0180,
      lng: 38.7580,
      icon: '🚑',
      phone: '+251-11-551-9393'
    }
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

  const getNearbyEmergencyLocations = (centerLat: number, centerLng: number) => {
    return baseEmergencyLocations.filter(location => {
      const distance = calculateDistance(centerLat, centerLng, location.lat, location.lng);
      return distance <= 5; // Only show emergency stations within 5km
    });
  };

  const handleEmergencyCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  // Update tracking state based on LocationContext
  useEffect(() => {
    if (contextLocation) {
      setIsTracking(true);
      setDisplayError('');
    } else if (locationError) {
      setIsTracking(false);
      setDisplayError(locationError);
    }
  }, [contextLocation, locationError]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    // Create map with better tile layer
    map.current = L.map(mapContainer.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      dragging: true,
      tapTolerance: 15
    }).setView([currentLocation.lat, currentLocation.lng], 15);

    // Use OpenStreetMap with better tile server
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      tileSize: 256,
      zoomOffset: 0
    }).addTo(map.current);

    // Create markers group
    markersGroup.current = L.layerGroup().addTo(map.current);

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Update map when location changes
  useEffect(() => {
    if (!map.current || !markersGroup.current) return;

    // Clear existing markers
    markersGroup.current.clearLayers();

    // Update map center to current location
    map.current.setView([currentLocation.lat, currentLocation.lng], 15);

    // Create animated user location marker
    const userIcon = L.divIcon({
      html: `
        <div style="
          background: ${isTracking ? '#10b981' : '#ef4444'}; 
          width: 20px; 
          height: 20px; 
          border-radius: 50%; 
          border: 3px solid white; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: -5px;
            left: -5px;
            width: 30px;
            height: 30px;
            border: 2px solid ${isTracking ? '#10b981' : '#ef4444'};
            border-radius: 50%;
            animation: pulse 2s infinite;
            opacity: 0.6;
          "></div>
        </div>
        <style>
          @keyframes pulse {
            0% { transform: scale(0.8); opacity: 0.8; }
            50% { transform: scale(1.2); opacity: 0.4; }
            100% { transform: scale(0.8); opacity: 0.8; }
          }
        </style>
      `,
      iconSize: [20, 20],
      className: 'user-location-marker'
    });

    userMarker.current = L.marker([currentLocation.lat, currentLocation.lng], { icon: userIcon })
      .addTo(markersGroup.current)
      .bindPopup(`
        <div style="text-align: center;">
          <strong>${isTracking ? '📍 Live Location' : '📍 Current Location'}</strong><br>
          <small>${isTracking ? 'Tracking active' : 'Using last known position'}</small>
          ${displayError ? `<br><small style="color: red;">Error: ${displayError}</small>` : ''}
        </div>
      `);

    // Add distance circle
    L.circle([currentLocation.lat, currentLocation.lng], {
      radius: distanceFilter * 1000,
      fillColor: '#f97316',
      fillOpacity: 0.1,
      color: '#f97316',
      weight: 2,
      dashArray: '10, 10'
    }).addTo(markersGroup.current);

    // Add service markers
    services.forEach((service) => {
      const serviceIcon = L.divIcon({
        html: `<div style="background: #f97316; color: white; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">S</div>`,
        iconSize: [30, 30],
        className: 'service-marker'
      });

      L.marker([service.location.lat, service.location.lng], { icon: serviceIcon })
        .addTo(markersGroup.current!)
        .bindPopup(`
          <div style="max-width: 200px;">
            <strong>${service.title}</strong><br>
            <small>${service.description}</small><br>
            <strong>ETB ${service.price.toLocaleString()}</strong><br>
            <small>by ${service.provider}</small><br>
            <small>${service.distance.toFixed(1)}km away</small>
          </div>
        `);
    });

    // Get nearby emergency locations and add markers
    const nearbyEmergencyLocations = getNearbyEmergencyLocations(currentLocation.lat, currentLocation.lng);
    nearbyEmergencyLocations.forEach((location) => {
      const emergencyIcon = L.divIcon({
        html: `<div style="background: #dc2626; color: white; width: 25px; height: 25px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 14px;">${location.icon}</div>`,
        iconSize: [25, 25],
        className: 'emergency-marker'
      });

      const marker = L.marker([location.lat, location.lng], { icon: emergencyIcon })
        .addTo(markersGroup.current!);

      const popupContent = document.createElement('div');
      popupContent.innerHTML = `
        <div style="text-align: center; max-width: 200px;">
          <strong>${location.name}</strong><br>
          <small>${location.type}</small><br>
          <button id="call-${location.name.replace(/\s+/g, '-')}" 
                  style="background: #16a34a; color: white; border: none; padding: 8px 16px; border-radius: 6px; margin-top: 8px; cursor: pointer; font-size: 12px;">
            📞 Call ${location.phone}
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('popupopen', () => {
        const callButton = document.getElementById(`call-${location.name.replace(/\s+/g, '-')}`);
        if (callButton) {
          callButton.addEventListener('click', () => {
            handleEmergencyCall(location.phone);
          });
        }
      });
    });

  }, [services, currentLocation, distanceFilter, isTracking, displayError]);

  const nearbyEmergencyLocations = getNearbyEmergencyLocations(currentLocation.lat, currentLocation.lng);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
};
