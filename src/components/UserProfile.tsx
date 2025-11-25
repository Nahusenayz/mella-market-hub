
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Star, MapPin, X, Phone, Mail, Calendar, User as UserIcon } from 'lucide-react';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  bio: string;
  rating: number;
  total_ratings: number;
  profile_image_url: string;
  created_at: string;
}

interface UserAd {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  created_at: string;
  ad_type: string;
}

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
  onMessage?: (userId: string, userName: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ 
  userId, 
  onClose, 
  onMessage 
}) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userAds, setUserAds] = useState<UserAd[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      setProfile(profileData);

      // Fetch user ads
      const { data: adsData, error: adsError } = await supabase
        .from('ads')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (adsError) {
        console.error('Error fetching ads:', adsError);
        return;
      }

      setUserAds(adsData || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = () => {
    if (profile && onMessage) {
      onMessage(userId, profile.full_name);
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  const getAdTypeBadgeColor = (adType: string) => {
    switch (adType) {
      case 'service': return 'bg-blue-100 text-blue-800';
      case 'sell': return 'bg-green-100 text-green-800';
      case 'rent': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-md mx-4">
          <p className="text-center text-gray-600 mb-4">Profile not found</p>
          <button
            onClick={onClose}
            className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.id === userId;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
          
          <div className="flex items-center gap-4">
            {profile.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt={profile.full_name}
                className="w-20 h-20 rounded-full object-cover border-4 border-white"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white bg-opacity-20 flex items-center justify-center border-4 border-white">
                <UserIcon size={32} className="text-white" />
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{profile.full_name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Star size={16} className="text-yellow-300 fill-current" />
                <span className="text-lg">
                  {profile.rating?.toFixed(1) || '0.0'} ({profile.total_ratings || 0} reviews)
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-white text-opacity-90">
                <Calendar size={14} />
                <span className="text-sm">Member since {formatDate(profile.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Bio Section */}
          {profile.bio && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">About</h2>
              <p className="text-gray-600 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Contact Info */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.email && (
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-gray-500" />
                  <span className="text-gray-600">{profile.email}</span>
                </div>
              )}
              {profile.phone_number && (
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-gray-500" />
                  <span className="text-gray-600">{profile.phone_number}</span>
                </div>
              )}
            </div>
          </div>

          {/* User's Ads */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {isOwnProfile ? 'Your' : `${profile.full_name}'s`} Listings ({userAds.length})
            </h2>
            
            {userAds.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userAds.map(ad => (
                  <div key={ad.id} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800 truncate flex-1">{ad.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ml-2 ${getAdTypeBadgeColor(ad.ad_type)}`}>
                        {ad.ad_type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{ad.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-orange-600 font-bold">ETB {ad.price.toLocaleString()}</span>
                      <span className="text-xs text-gray-500">{ad.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No active listings</p>
            )}
          </div>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <div className="flex gap-4 pt-4 border-t">
              <button
                onClick={handleMessage}
                className="flex-1 bg-orange-500 text-white py-3 px-6 rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Mail size={20} />
                Send Message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
