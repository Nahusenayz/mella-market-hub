import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TrackingMapProps {
    userLocation: { lat: number; lng: number };
    responderLocation: { lat: number; lng: number };
    responderType?: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getTrafficMultiplier(): number {
    const hour = new Date().getHours();
    // Rush hours: 7-9am (1.5x), 12-2pm (1.2x), 5-8pm (1.8x)
    if (hour >= 7 && hour <= 9) return 1.5;
    if (hour >= 12 && hour <= 14) return 1.2;
    if (hour >= 17 && hour <= 20) return 1.8;
    if (hour >= 22 || hour <= 5) return 0.8;
    return 1.0;
}

function estimateMinutes(distanceKm: number): number {
    const avgSpeedKmh = 30; // city average
    const trafficMul = getTrafficMultiplier();
    const minutes = (distanceKm / avgSpeedKmh) * 60 * trafficMul;
    return Math.max(1, Math.round(minutes));
}

export const TrackingMap: React.FC<TrackingMapProps> = ({
    userLocation,
    responderLocation,
    responderType = 'ambulance'
}) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);
    const markersGroup = useRef<L.LayerGroup | null>(null);

    const distanceKm = useMemo(() => haversineKm(
        userLocation.lat, userLocation.lng,
        responderLocation.lat, responderLocation.lng
    ), [userLocation, responderLocation]);
    const etaMinutes = useMemo(() => estimateMinutes(distanceKm), [distanceKm]);

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

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainer} className="w-full h-full bg-gray-100 full-screen-map" />
            <div className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-sm min-w-[120px]">
                <div className="flex items-center gap-2 text-gray-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    ETA: {etaMinutes} min
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                    {distanceKm < 1
                        ? `${Math.round(distanceKm * 1000)}m away`
                        : `${distanceKm.toFixed(1)}km away`
                    }
                </div>
            </div>
        </div>
    );
};
