
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Ad {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  image_url: string | null;
  location_lat: number | null;
  location_lng: number | null;
  user_id: string;
  created_at: string;
  is_active: boolean;
  profiles?: {
    full_name: string;
    rating: number;
    profile_image_url: string;
    is_verified?: boolean;
  } | null;
}

export const useRealTimeAds = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAds = async (userLocation?: { lat: number; lng: number }, maxDistance: number = 5) => {
    try {
      const { data, error } = await supabase
        .from('ads')
        .select(`
          *,
          profiles (
            full_name,
            rating,
            profile_image_url,
            is_verified
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching ads:', error);
        return;
      }

      // Transform the data
      let transformedAds = (data || []).map(ad => ({
        ...ad,
        profiles: ad.profiles && typeof ad.profiles === 'object' && 'full_name' in ad.profiles ? {
          full_name: ad.profiles.full_name || '',
          rating: ad.profiles.rating || 0,
          profile_image_url: ad.profiles.profile_image_url || '',
          is_verified: ad.profiles.is_verified || false
        } : null
      }));

      // Filter by distance if user location is available
      if (userLocation) {
        transformedAds = transformedAds.filter(ad => {
          if (!ad.location_lat || !ad.location_lng) return false;

          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            ad.location_lat,
            ad.location_lng
          );

          return distance <= maxDistance;
        });
      }

      setAds(transformedAds);
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Get user location and fetch ads
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          fetchAds(userLocation, 5); // 5km max distance
        },
        (error) => {
          console.log('Geolocation error:', error);
          fetchAds(); // Fetch without location filter
        }
      );
    } else {
      fetchAds(); // Fetch without location filter
    }

    // Set up real-time subscription for ads
    const channel = supabase
      .channel('ads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ads'
        },
        (payload) => {
          console.log('Real-time ads update:', payload);
          // Refetch with current location constraints
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const userLocation = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                };
                fetchAds(userLocation, 5);
              },
              () => fetchAds()
            );
          } else {
            fetchAds();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const searchAds = async (query: string, location?: { lat: number; lng: number }, radius?: number) => {
    try {
      let queryBuilder = supabase
        .from('ads')
        .select(`
          *,
          profiles (
            full_name,
            rating,
            profile_image_url,
            is_verified
          )
        `)
        .eq('is_active', true);

      if (query) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`);
      }

      const { data, error } = await queryBuilder.order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching ads:', error);
        return [];
      }

      let filteredData = data || [];

      // Transform the data
      const transformedAds = filteredData.map(ad => ({
        ...ad,
        profiles: ad.profiles && typeof ad.profiles === 'object' && 'full_name' in ad.profiles ? {
          full_name: ad.profiles.full_name || '',
          rating: ad.profiles.rating || 0,
          profile_image_url: ad.profiles.profile_image_url || '',
          is_verified: ad.profiles.is_verified || false
        } : null
      }));

      // Filter by location if provided, with max 5km limit
      if (location && transformedAds.length > 0) {
        const maxRadius = Math.min(radius || 5, 5); // Ensure max 5km
        return transformedAds.filter(ad => {
          if (!ad.location_lat || !ad.location_lng) return false;

          const distance = calculateDistance(
            location.lat,
            location.lng,
            ad.location_lat,
            ad.location_lng
          );

          return distance <= maxRadius;
        });
      }

      return transformedAds;
    } catch (error) {
      console.error('Error searching ads:', error);
      return [];
    }
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

  return { ads, loading, searchAds, refetch: fetchAds };
};
