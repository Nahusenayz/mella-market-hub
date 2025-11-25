import React from 'react';
import { Star, MapPin, MessageCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Service {
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
  };
}

interface ServiceCardProps {
  service: Service;
  onBook?: (service: Service) => void;
  onMessage?: (userId: string, userName: string) => void;
  onUserProfileClick?: (userId: string) => void;
  onPostClick?: (service: Service) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ 
  service, 
  onBook, 
  onMessage, 
  onUserProfileClick,
  onPostClick
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleMessage = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    const userName = service.profiles?.full_name || service.provider || 'User';
    onMessage?.(service.user_id, userName);
  };

  const handleBook = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    onBook?.(service);
  };

  const handleUserProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('User profile clicked for user:', service.user_id);
    if (onUserProfileClick) {
      onUserProfileClick(service.user_id);
    }
  };

  const handlePostClick = () => {
    onPostClick?.(service);
  };

  const isOwnAd = user?.id === service.user_id;

  return (
    <div 
      className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
      onClick={handlePostClick}
    >
      <div className="relative">
        <img
          src={service.image}
          alt={service.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-4 right-4 bg-white rounded-full px-3 py-1 shadow-lg">
          <span className="text-orange-600 font-bold">ETB {service.price.toLocaleString()}</span>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-800 flex-1">{service.title}</h3>
          <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full ml-2">
            {service.category}
          </span>
        </div>
        
        <p className="text-gray-600 mb-4 line-clamp-2">{service.description}</p>
        
        {/* Provider Info */}
        <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          {service.profiles?.profile_image_url ? (
            <img
              src={service.profiles.profile_image_url}
              alt={service.profiles.full_name}
              className="w-10 h-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-orange-300 transition-all"
              onClick={handleUserProfileClick}
            />
          ) : (
            <div 
              className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center cursor-pointer hover:bg-orange-200 transition-colors"
              onClick={handleUserProfileClick}
            >
              <User size={16} className="text-orange-600" />
            </div>
          )}
          
          <div className="flex-1">
            <p 
              className="font-medium text-gray-800 cursor-pointer hover:text-orange-600 transition-colors"
              onClick={handleUserProfileClick}
            >
              {service.profiles?.full_name || service.provider}
            </p>
            <div className="flex items-center gap-1">
              <Star size={14} className="text-yellow-500 fill-current" />
              <span className="text-sm text-gray-600">
                {service.profiles?.rating?.toFixed(1) || service.rating.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <MapPin size={16} className="text-orange-500" />
            <span>{service.distance.toFixed(1)} km away</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          {!isOwnAd && (
            <>
              <button
                onClick={handleMessage}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <MessageCircle size={16} />
                Message
              </button>
              <button
                onClick={handleBook}
                className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Book Now
              </button>
            </>
          )}
          
          {isOwnAd && (
            <div className="w-full text-center py-2 px-4 bg-green-100 text-green-800 rounded-lg font-medium">
              Your Ad
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
