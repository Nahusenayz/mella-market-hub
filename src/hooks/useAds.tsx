
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
}

export const useAds = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAds = async () => {
    try {
      const { data, error } = await supabase
        .from('ads')
        .select(`
          *,
          profiles:user_id (
            full_name,
            rating
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching ads:', error);
        return;
      }

      setAds(data || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const addAd = (newAd: Ad) => {
    setAds(prev => [newAd, ...prev]);
  };

  return { ads, loading, addAd, refetch: fetchAds };
};
