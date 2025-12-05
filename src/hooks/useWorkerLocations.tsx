import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WorkerLocation {
    id: string;
    worker_id: string;
    category: string;
    location_lat: number;
    location_lng: number;
    is_available: boolean;
    last_updated: string;
    created_at: string;
    profiles?: {
        full_name: string;
        profile_image_url?: string;
    };
    distance?: number;
}

export const useWorkerLocations = (filterCategory?: string) => {
    const [workers, setWorkers] = useState<WorkerLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchWorkers = useCallback(async () => {
        try {
            console.log('🔍 Fetching workers from worker_locations table...');

            // Fetch worker locations
            const { data: locationsData, error: locationsError } = await supabase
                .from('worker_locations' as any)
                .select('*')
                .eq('is_available', true);

            console.log('📍 Worker locations response:', { data: locationsData, error: locationsError });

            if (locationsError) {
                console.error('❌ Error fetching worker locations:', locationsError);
                setError(locationsError.message);
                setLoading(false);
                return;
            }

            if (!locationsData || locationsData.length === 0) {
                console.log('📭 No workers found in worker_locations table');
                setWorkers([]);
                setLoading(false);
                return;
            }

            console.log('✅ Found workers:', locationsData.length);

            // Fetch profile data for each worker
            const workerIds = (locationsData as any[]).map((loc: any) => loc.worker_id);
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, profile_image_url')
                .in('id', workerIds);

            if (profilesError) {
                console.error('Error fetching profiles:', profilesError);
            }

            // Combine location and profile data
            const workersWithProfiles: WorkerLocation[] = (locationsData as any[]).map((loc: any) => {
                const profile = (profilesData as any[])?.find((p: any) => p.id === loc.worker_id);
                return {
                    id: loc.id,
                    worker_id: loc.worker_id,
                    category: loc.category,
                    location_lat: loc.location_lat,
                    location_lng: loc.location_lng,
                    is_available: loc.is_available,
                    last_updated: loc.last_updated,
                    created_at: loc.created_at,
                    profiles: profile ? {
                        full_name: profile.full_name || 'Responder',
                        profile_image_url: profile.profile_image_url
                    } : {
                        full_name: 'Responder',
                        profile_image_url: undefined
                    }
                };
            });

            setWorkers(workersWithProfiles);
            setError(null);
        } catch (e: any) {
            console.error('💥 Error fetching workers:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [filterCategory]);

    useEffect(() => {
        fetchWorkers();

        // Set up real-time subscription for worker_locations
        const channel = supabase
            .channel('worker-locations-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'worker_locations'
                },
                () => {
                    console.log('🔄 Worker location update received');
                    fetchWorkers();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchWorkers]);

    const getWorkersByCategory = (category: string) => {
        return workers.filter(w => w.category === category);
    };

    const getNearbyWorkers = (
        userLat: number,
        userLng: number,
        maxDistanceKm: number = 10
    ) => {
        return workers
            .map(worker => ({
                ...worker,
                distance: calculateDistance(
                    userLat,
                    userLng,
                    worker.location_lat,
                    worker.location_lng
                )
            }))
            .filter(worker => worker.distance <= maxDistanceKm)
            .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    };

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

    return {
        workers,
        loading,
        error,
        refetch: fetchWorkers,
        getWorkersByCategory,
        getNearbyWorkers
    };
};
