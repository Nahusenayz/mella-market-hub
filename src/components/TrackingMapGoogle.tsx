import React, { useMemo } from 'react';
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api';

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
    if (hour >= 7 && hour <= 9) return 1.5;
    if (hour >= 12 && hour <= 14) return 1.2;
    if (hour >= 17 && hour <= 20) return 1.8;
    if (hour >= 22 || hour <= 5) return 0.8;
    return 1.0;
}

function estimateMinutes(distanceKm: number): number {
    const avgSpeedKmh = 30;
    const trafficMul = getTrafficMultiplier();
    return Math.max(1, Math.round((distanceKm / avgSpeedKmh) * 60 * trafficMul));
}

const containerStyle = { width: '100%', height: '100%' };

const getResponderEmoji = (type: string) => {
    switch (type) {
        case 'police': return '🚓';
        case 'fire': return '🚒';
        case 'traffic': return '🏍️';
        default: return '🚑';
    }
};

export const TrackingMap: React.FC<TrackingMapProps> = ({
    userLocation,
    responderLocation,
    responderType = 'ambulance'
}) => {
    const distanceKm = useMemo(() => haversineKm(
        userLocation.lat, userLocation.lng,
        responderLocation.lat, responderLocation.lng
    ), [userLocation, responderLocation]);
    const etaMinutes = useMemo(() => estimateMinutes(distanceKm), [distanceKm]);

    const center = useMemo(() => ({
        lat: (userLocation.lat + responderLocation.lat) / 2,
        lng: (userLocation.lng + responderLocation.lng) / 2,
    }), [userLocation, responderLocation]);

    const path = useMemo(() => [
        { lat: userLocation.lat, lng: userLocation.lng },
        { lat: responderLocation.lat, lng: responderLocation.lng },
    ], [userLocation, responderLocation]);

    const userIcon = {
        url: `data:image/svg+xml,${encodeURIComponent(`<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="8" fill="#2563eb" stroke="white" stroke-width="3"/>
            <circle cx="16" cy="16" r="14" fill="#2563eb" fill-opacity="0.15" stroke="none"/>
        </svg>`)}`,
    };

    const responderIcon = {
        url: `data:image/svg+xml,${encodeURIComponent(`<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <text x="20" y="28" text-anchor="middle" font-size="24">${getResponderEmoji(responderType)}</text>
        </svg>`)}`,
    };

    return (
        <div className="relative w-full h-full">
            <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={center}
                    zoom={14}
                    options={{
                        zoomControl: false,
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                        scrollwheel: false,
                        draggable: true,
                    }}
                >
                    <Marker position={{ lat: userLocation.lat, lng: userLocation.lng }} icon={userIcon} />
                    <Marker position={{ lat: responderLocation.lat, lng: responderLocation.lng }} icon={responderIcon} />
                    <Polyline
                        path={path}
                        options={{
                            strokeColor: '#2563eb',
                            strokeOpacity: 0.8,
                            strokeWeight: 5,
                        }}
                    />
                </GoogleMap>
            </LoadScript>
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
