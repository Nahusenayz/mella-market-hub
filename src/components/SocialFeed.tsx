
import React from 'react';
import { Heart, MessageCircle, Share2, MapPin, Star } from 'lucide-react';
import { useSocialFeed } from '@/hooks/useSocialFeed';
import { VerificationBadge } from './VerificationBadge';

export const SocialFeed: React.FC = () => {
  const { activities, loading } = useSocialFeed();

  const getActivityContent = (activity: any) => {
    switch (activity.activity_type) {
      case 'new_service':
        return (
          <div className="space-y-3">
            <p className="text-gray-800">
              <span className="font-medium">{activity.user.full_name}</span> posted a new service
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">{activity.content.title}</h4>
              <p className="text-gray-600 text-sm mb-2">{activity.content.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="font-medium text-orange-600">ETB {activity.content.price}</span>
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {activity.content.category}
                </span>
              </div>
            </div>
          </div>
        );
      
      case 'completed_booking':
        return (
          <div className="space-y-3">
            <p className="text-gray-800">
              <span className="font-medium">{activity.user.full_name}</span> completed a service booking
            </p>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Star className="text-yellow-500 fill-yellow-500" size={16} />
                <span className="text-sm font-medium">Service completed successfully!</span>
              </div>
            </div>
          </div>
        );

      case 'received_review':
        return (
          <div className="space-y-3">
            <p className="text-gray-800">
              <span className="font-medium">{activity.user.full_name}</span> received a {activity.content.rating}-star review
            </p>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={i < activity.content.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                  />
                ))}
              </div>
              {activity.content.comment && (
                <p className="text-sm text-gray-600">"{activity.content.comment}"</p>
              )}
            </div>
          </div>
        );

      default:
        return (
          <p className="text-gray-600">
            {activity.content.message || 'New activity'}
          </p>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h2>
        
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No recent activity</p>
            <p className="text-sm text-gray-400 mt-2">Start using the app to see updates from your network!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activities.map((activity) => (
              <div key={activity.id} className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0">
                <div className="flex items-start gap-3 mb-4">
                  {activity.user.profile_image_url ? (
                    <img
                      src={activity.user.profile_image_url}
                      alt={activity.user.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="text-orange-600 font-medium">
                        {activity.user.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-800">{activity.user.full_name}</span>
                      <VerificationBadge
                        isVerified={activity.user.is_verified}
                        badges={activity.user.badges}
                        size="sm"
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(activity.created_at).toLocaleDateString()} at{' '}
                      {new Date(activity.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {getActivityContent(activity)}

                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
                  <button className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors">
                    <Heart size={18} />
                    <span className="text-sm">Like</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors">
                    <MessageCircle size={18} />
                    <span className="text-sm">Comment</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-500 hover:text-green-500 transition-colors">
                    <Share2 size={18} />
                    <span className="text-sm">Share</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
