import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LocationContextType {
    location: { lat: number; lng: number } | null;
    loading: boolean;
    error: string | null;
    permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown';
    requestPermission: () => Promise<void>;
    refreshLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Default location: Addis Ababa, Ethiopia
const DEFAULT_LOCATION = { lat: 9.0257, lng: 38.7468 };

interface LocationProviderProps {
    children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
    const [watchId, setWatchId] = useState<number | null>(null);

    const handleLocationSuccess = (position: GeolocationPosition) => {
        setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
        });
        setError(null);
        setLoading(false);
        setPermissionStatus('granted');
    };

    const handleLocationError = (error: GeolocationPositionError) => {
        console.error('Location error:', error);

        let errorMessage = 'Unable to get your location';
        switch (error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = 'Location permission denied';
                setPermissionStatus('denied');
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information unavailable';
                break;
            case error.TIMEOUT:
                errorMessage = 'Location request timed out';
                break;
        }

        setError(errorMessage);
        // Use default location as fallback
        setLocation(DEFAULT_LOCATION);
        setLoading(false);
    };

    const requestPermission = async () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setLocation(DEFAULT_LOCATION);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        // First get current position
        navigator.geolocation.getCurrentPosition(
            handleLocationSuccess,
            handleLocationError,
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );

        // Then start watching for position changes
        const id = navigator.geolocation.watchPosition(
            handleLocationSuccess,
            (error) => {
                console.error('Watch position error:', error);
                // Don't show error for watch failures, just log them
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 30000, // Cache for 30 seconds
            }
        );

        setWatchId(id);
    };

    const refreshLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setLocation(DEFAULT_LOCATION);
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            handleLocationSuccess,
            handleLocationError,
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    useEffect(() => {
        // Check permission status on mount
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');

                if (result.state === 'granted') {
                    requestPermission();
                } else if (result.state === 'prompt') {
                    // Auto-request permission on mount
                    requestPermission();
                } else {
                    // Permission denied, use default location
                    setLocation(DEFAULT_LOCATION);
                    setLoading(false);
                }

                // Listen for permission changes
                result.addEventListener('change', () => {
                    setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
                    if (result.state === 'granted') {
                        requestPermission();
                    }
                });
            }).catch(() => {
                // Fallback if permissions API not available
                requestPermission();
            });
        } else {
            // Fallback for browsers without permissions API
            requestPermission();
        }

        // Cleanup watch on unmount
        return () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, []);

    const value: LocationContextType = {
        location,
        loading,
        error,
        permissionStatus,
        requestPermission,
        refreshLocation,
    };

    return (
        <LocationContext.Provider value={value}>
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
};
