
import React from 'react';
import { X, MapPin, Clock, User, Star, MessageSquare, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VerificationBadge } from './VerificationBadge';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    provider: string;
    rating: number;
    distance: number;
    image: string;
    location: { lat: number; lng: number };
    user_id: string;
    profiles?: {
      full_name: string;
      rating: number;
      profile_image_url: string;
      is_verified?: boolean;
      badges?: string[];
    };
  };
  onBook: () => void;
  onMessage: () => void;
  onCall?: () => void;
  onEdit?: () => void;
}

export const PostModal: React.FC<PostModalProps> = ({
  isOpen,
  onClose,
  post,
  onBook,
  onMessage,
  onCall,
  onEdit,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-xl font-bold">{post.title}</span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Post Image */}
          <div className="w-full h-64 rounded-lg overflow-hidden">
            <img
              src={post.image}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Provider Info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
              {post.profiles?.profile_image_url ? (
                <img
                  src={post.profiles.profile_image_url}
                  alt={post.provider}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="text-gray-400" size={24} />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-800">{post.provider}</h3>
                <VerificationBadge
                  isVerified={post.profiles?.is_verified || false}
                  badges={post.profiles?.badges || []}
                  size="sm"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Star className="text-yellow-500" size={16} />
                <span>{post.rating.toFixed(1)}</span>
                <span>•</span>
                <MapPin size={16} />
                <span>{post.distance.toFixed(1)} km away</span>
              </div>
            </div>
          </div>

          {/* Price and Category */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-orange-600">
                ETB {post.price.toLocaleString()}
              </span>
              <p className="text-sm text-gray-500 capitalize">{post.category}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock size={16} />
              <span>Available now</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Description</h4>
            <p className="text-gray-600 leading-relaxed">{post.description}</p>
          </div>

          {/* Location */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Location</h4>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin size={16} />
              <span>
                {post.location.lat.toFixed(4)}, {post.location.lng.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t flex-wrap">
            <button
              onClick={onBook}
              className="flex-1 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Book Service
            </button>
            <button
              onClick={onMessage}
              className="flex items-center justify-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <MessageSquare size={18} />
              Message
            </button>
            {onCall && (
              <button
                onClick={onCall}
                className="flex items-center justify-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
              >
                <Phone size={18} />
                Call
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center justify-center gap-2 bg-gray-100 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
