
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateDistanceKm } from '@/lib/utils';

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
  } | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  is_furnished: boolean | null;
  listing_type: string | null;
}

const SAMPLE_ADS: Ad[] = [
  {
    id: 'sample-ad-1',
    title: 'Professional Plumbing & Water Emergency Repair',
    description: 'Expert plumbing service in Addis Ababa. Pipe leaks, bathroom repairs, water tank installations available 24/7.',
    category: 'Home Repair',
    price: 450,
    image_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=800',
    location_lat: 9.032,
    location_lng: 38.747,
    user_id: 'sample-user-1',
    created_at: new Date().toISOString(),
    is_active: true,
    profiles: {
      full_name: 'Abebe Bekele',
      rating: 4.9,
      profile_image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
    },
    property_type: null,
    bedrooms: null,
    bathrooms: null,
    area_sqm: null,
    is_furnished: null,
    listing_type: null
  },
  {
    id: 'sample-ad-2',
    title: 'Solar System & Electrical Appliance Installation',
    description: 'Certified electrical engineer offering solar inverter setup, generator wiring, and house electrical maintenance.',
    category: 'Tech Support',
    price: 800,
    image_url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&q=80&w=800',
    location_lat: 9.025,
    location_lng: 38.752,
    user_id: 'sample-user-2',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    is_active: true,
    profiles: {
      full_name: 'Tigist Haile',
      rating: 4.8,
      profile_image_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'
    },
    property_type: null,
    bedrooms: null,
    bathrooms: null,
    area_sqm: null,
    is_furnished: null,
    listing_type: null
  },
  {
    id: 'sample-ad-3',
    title: 'Emergency Towing & Heavy Recovery Service',
    description: '24/7 Tow truck service operating across Addis Ababa, Bole, Kazanchis, and Merkato regions.',
    category: 'Transportation',
    price: 1200,
    image_url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=800',
    location_lat: 9.018,
    location_lng: 38.761,
    user_id: 'sample-user-3',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    is_active: true,
    profiles: {
      full_name: 'Dawit Yohannes',
      rating: 5.0,
      profile_image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'
    },
    property_type: null,
    bedrooms: null,
    bathrooms: null,
    area_sqm: null,
    is_furnished: null,
    listing_type: null
  },
  {
    id: 'sample-ad-4',
    title: 'Authentic Ethiopian Coffee & Traditional Event Catering',
    description: 'Full catering service for weddings, cultural events, and corporate gatherings with fresh ingredients.',
    category: 'Catering',
    price: 2500,
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=800',
    location_lat: 9.041,
    location_lng: 38.739,
    user_id: 'sample-user-4',
    created_at: new Date(Date.now() - 10800000).toISOString(),
    is_active: true,
    profiles: {
      full_name: 'Marta Tadesse',
      rating: 4.7,
      profile_image_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
    },
    property_type: null,
    bedrooms: null,
    bathrooms: null,
    area_sqm: null,
    is_furnished: null,
    listing_type: null
  },
  {
    id: 'sample-ad-5',
    title: 'Safety Alert: Street Light Maintenance in Bole Medhanialem',
    description: 'Community warning: Street lighting upgrades taking place along Bole Road. Please exercise caution when driving at night.',
    category: 'Safety Alert',
    price: 0,
    image_url: 'https://images.unsplash.com/photo-1508873696983-2df515122519?auto=format&fit=crop&q=80&w=800',
    location_lat: 9.001,
    location_lng: 38.784,
    user_id: 'sample-user-5',
    created_at: new Date(Date.now() - 14400000).toISOString(),
    is_active: true,
    profiles: {
      full_name: 'Bole District Patrol',
      rating: 4.9,
      profile_image_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'
    },
    property_type: null,
    bedrooms: null,
    bathrooms: null,
    area_sqm: null,
    is_furnished: null,
    listing_type: null
  },
  {
    id: 'sample-ad-6',
    title: 'Modern 3-Bedroom Furnished Apartment for Rent',
    description: 'Spacious apartment in CMC area with high-speed internet, 24/7 water backup generator, and dedicated parking.',
    category: 'Properties',
    price: 35000,
    image_url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800',
    location_lat: 9.015,
    location_lng: 38.795,
    user_id: 'sample-user-6',
    created_at: new Date(Date.now() - 18000000).toISOString(),
    is_active: true,
    profiles: {
      full_name: 'Solomon Worku',
      rating: 5.0,
      profile_image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'
    },
    property_type: 'Apartment',
    bedrooms: 3,
    bathrooms: 2,
    area_sqm: 140,
    is_furnished: true,
    listing_type: 'Rent'
  }
];

export const useRealTimeAds = () => {
  const [ads, setAds] = useState<Ad[]>(SAMPLE_ADS);
  const [loading, setLoading] = useState(true);

  const fetchAds = async (retryCount = 0) => {
    try {
      if (retryCount === 0) setLoading(true);
      
      const { data, error } = await supabase
        .from('ads')
        .select(`
          *,
          profiles:user_id (
            full_name,
            rating,
            profile_image_url
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching ads:', error);
        // Retry on network errors
        if (retryCount < 3) {
          console.log(`Retrying fetchAds (${retryCount + 1}/3)...`);
          setTimeout(() => fetchAds(retryCount + 1), 2000);
          return;
        }
        setAds(SAMPLE_ADS);
        setLoading(false);
        return;
      }

      // Transform the data
      const transformedAds = (data || []).map(ad => ({
        ...ad,
        profiles: ad.profiles && typeof ad.profiles === 'object' && 'full_name' in ad.profiles ? {
          full_name: ad.profiles.full_name || '',
          rating: ad.profiles.rating || 0,
          profile_image_url: ad.profiles.profile_image_url || ''
        } : null
      })) as unknown as Ad[];

      if (transformedAds.length === 0) {
        setAds(SAMPLE_ADS);
      } else {
        setAds(transformedAds);
      }
      setLoading(false);
    } catch (error: any) {
      console.error('Error in fetchAds:', error);
      if (error.message?.includes('fetch') && retryCount < 3) {
        console.log(`Retrying fetchAds due to network error (${retryCount + 1}/3)...`);
        setTimeout(() => fetchAds(retryCount + 1), 2000);
      } else {
        setAds(SAMPLE_ADS);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchAds();

    const channel = supabase
      .channel('ads-changes-main')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ads'
        },
        () => {
          fetchAds();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          // Update rating in-place for affected user's ads
          const updatedProfile = payload.new as any;
          setAds(prev => prev.map(ad => {
            if (ad.user_id === updatedProfile.id) {
              return {
                ...ad,
                profiles: {
                  full_name: updatedProfile.full_name || ad.profiles?.full_name || '',
                  rating: updatedProfile.rating || 0,
                  profile_image_url: updatedProfile.profile_image_url || ad.profiles?.profile_image_url || ''
                }
              };
            }
            return ad;
          }));
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
          profiles:user_id (
            full_name,
            rating,
            profile_image_url
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
          profile_image_url: ad.profiles.profile_image_url || ''
        } : null
      })) as unknown as Ad[];

      // Filter by location if provided, with max 5km limit
      if (location && transformedAds.length > 0) {
        const maxRadius = Math.min(radius || 5, 5); // Ensure max 5km
        return transformedAds.filter(ad => {
          if (!ad.location_lat || !ad.location_lng) return false;

          const distance = calculateDistanceKm(
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

  return { ads, loading, searchAds, refetch: fetchAds };
};
