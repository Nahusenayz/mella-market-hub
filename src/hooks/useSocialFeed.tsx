
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FeedActivity {
  id: string;
  user_id: string;
  activity_type: string;
  content: any;
  visibility: string;
  created_at: string;
  user: {
    full_name: string;
    profile_image_url?: string;
    is_verified: boolean;
    badges: string[];
  };
}

export const useSocialFeed = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<FeedActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    try {
      const { data, error } = await supabase
        .from('feed_activities')
        .select(`
          *,
          user:user_id (
            full_name,
            profile_image_url,
            is_verified,
            badges
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        // If table doesn't exist (404), just log it and continue with empty feed
        if (error.message?.includes('does not exist') || error.code === 'PGRST116' || error.code === '42P01') {
          console.log('Feed activities table not found - social feed disabled');
          setActivities([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      // Transform the data to match our interface
      const transformedActivities = (data || []).map(activity => ({
        ...activity,
        user: {
          full_name: activity.user?.full_name || 'Unknown User',
          profile_image_url: activity.user?.profile_image_url,
          is_verified: activity.user?.is_verified || false,
          badges: Array.isArray(activity.user?.badges) ? activity.user.badges : []
        }
      }));

      setActivities(transformedActivities as FeedActivity[]);
    } catch (error: any) {
      // Silently handle database errors to prevent app crashes
      console.log('Social feed unavailable:', error.message || error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const createActivity = async (activityType: string, content: any, visibility = 'public') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('feed_activities')
        .insert({
          user_id: user.id,
          activity_type: activityType,
          content,
          visibility
        });

      // Silently fail if table doesn't exist
      if (error && (error.message?.includes('does not exist') || error.code === 'PGRST116' || error.code === '42P01')) {
        console.log('Feed activities table not available');
        return;
      }

      if (error) throw error;

      fetchFeed(); // Refresh feed
    } catch (error: any) {
      console.log('Could not create activity:', error.message || error);
    }
  };

  useEffect(() => {
    fetchFeed();

    // Set up real-time subscription
    const channel = supabase
      .channel('feed-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feed_activities'
        },
        () => {
          fetchFeed();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    activities,
    loading,
    createActivity,
    refetch: fetchFeed
  };
};
