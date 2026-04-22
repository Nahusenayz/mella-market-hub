import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AdminProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  user_type: string | null;
  avatar_url: string | null;
}

interface UseAdminAuthReturn {
  isAdmin: boolean;
  isLoading: boolean;
  profile: AdminProfile | null;
}

export const useAdminAuth = (): UseAdminAuthReturn => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (authLoading) return;

      if (!user) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, user_type, avatar_url')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching admin profile:', error);
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error('Admin auth check failed:', err);
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, [user, authLoading]);

  return {
    isAdmin: profile?.user_type === 'admin',
    isLoading: isLoading || authLoading,
    profile,
  };
};
