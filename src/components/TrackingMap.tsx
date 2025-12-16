import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TrackingMapProps {
    userLocation: { lat: number; lng: number };
    responderLocation: { lat: number; lng: number };
    responderType?: string;
}

export const TrackingMap: React.FC<TrackingMapProps> = ({
    userLocation,
    responderLocation,
    responderType = 'ambulance'
}) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);
    const markersGroup = useRef<L.LayerGroup | null>(null);

    useEffect(() => {
        if (!mapContainer.current) return;

        // Initialize map
        map.current = L.map(mapContainer.current, {
            zoomControl: false, // We want a clean UI
            scrollWheelZoom: true,
            dragging: true,
            zoomSnap: 0.1
        }).setView([userLocation.lat, userLocation.lng], 15);

        // Light, clean map style
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map.current);

        markersGroup.current = L.layerGroup().addTo(map.current);

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []); // Only run once on mount

    useEffect(() => {
        if (!map.current || !markersGroup.current) return;

        markersGroup.current.clearLayers();

        // Custom icons
        const userIcon = L.divIcon({
            html: `
        <div class="relative flex items-center justify-center w-8 h-8">
          <div class="absolute w-full h-full bg-blue-500/30 rounded-full animate-ping"></div>
          <div class="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>
        </div>
      `,
            className: 'bg-transparent',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const getResponderEmoji = (type: string) => {
            switch (type) {
                case 'police': return '🚓';
                case 'fire': return '🚒';
                case 'traffic': return '🏍️';
                default: return '🚑';
            }
        };

        const responderIcon = L.divIcon({
            html: `
        <div class="text-3xl transform -translate-x-1/2 -translate-y-1/2 filter drop-shadow-md">
            ${getResponderEmoji(responderType)}
        </div>
      `,
            className: 'bg-transparent',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        // Add markers
        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(markersGroup.current);
        L.marker([responderLocation.lat, responderLocation.lng], { icon: responderIcon }).addTo(markersGroup.current);

        // Draw path
        const path = L.polyline(
            [[userLocation.lat, userLocation.lng], [responderLocation.lat, responderLocation.lng]],
            {
                color: '#2563eb', // Blue color similar to screenshot
                weight: 5,
                opacity: 0.8,
                lineCap: 'round'
            }
        ).addTo(markersGroup.current);

        // Fit bounds to show both markers with some padding
        const bounds = L.latLngBounds(
            [userLocation.lat, userLocation.lng],
            [responderLocation.lat, responderLocation.lng]
        );
        map.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });

    }, [userLocation, responderLocation, responderType]);

    return <div ref={mapContainer} className="w-full h-full bg-gray-100 full-screen-map" />;
};
