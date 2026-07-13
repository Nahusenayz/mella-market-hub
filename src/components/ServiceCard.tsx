import React from 'react';
import { Star, MapPin, MessageCircle, User, Share2, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { Translated } from './Translated';

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
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number;
  is_furnished?: boolean;
  listing_type?: string;
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
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(service.id);

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
      className="glass-card rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer group"
      onClick={handlePostClick}
    >
      <div className="relative overflow-hidden">
        <img
          src={service.image}
          alt={service.title}
          className="w-full h-56 object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute top-4 right-4 premium-gradient-orange rounded-2xl px-4 py-2 shadow-xl backdrop-blur-md border border-white/30">
          <span className="text-white font-black tracking-tight">ETB {service.price.toLocaleString()}</span>
        </div>
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); toggleFavorite(service.id); }}
            className="p-2 rounded-xl bg-black/30 backdrop-blur-md border border-white/20 hover:bg-black/50 transition-all active:scale-90"
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart size={16} className={favorited ? 'fill-red-500 text-red-500' : 'text-white'} />
          </button>
          <span className="bg-black/40 backdrop-blur-md rounded-2xl px-3 py-1 border border-white/20">
            <span className="text-white text-xs font-bold uppercase tracking-widest">{service.category}</span>
          </span>
        </div>
      </div>
      
      <div className="p-6 relative">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-orange-600 transition-colors leading-tight"><Translated text={service.title} /></h3>
        </div>
        
        <p className="text-slate-600 mb-6 line-clamp-2 text-sm leading-relaxed">{service.description}</p>
        
        {/* Provider Info - Premium Glass look */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-white/40 rounded-2xl border border-white/50 shadow-inner">
          {service.profiles?.profile_image_url ? (
            <img
              src={service.profiles.profile_image_url}
              alt={service.profiles.full_name}
              className="w-12 h-12 rounded-2xl object-cover cursor-pointer ring-4 ring-white shadow-lg group-hover:ring-orange-100 transition-all"
              onClick={handleUserProfileClick}
            />
          ) : (
            <div 
              className="w-12 h-12 rounded-2xl premium-gradient-orange flex items-center justify-center cursor-pointer shadow-lg"
              onClick={handleUserProfileClick}
            >
              <User size={20} className="text-white" />
            </div>
          )}
          
          <div className="flex-1">
            <p 
              className="font-bold text-slate-900 cursor-pointer hover:text-orange-600 transition-colors"
              onClick={handleUserProfileClick}
            >
              <Translated text={service.profiles?.full_name || service.provider} />
            </p>
            <div className="flex items-center gap-1.5">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    size={12} 
                    className={`${i < Math.floor(service.profiles?.rating || service.rating) ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} 
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-slate-500">
                ({(service.profiles?.rating || service.rating).toFixed(1)})
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-6">
          <div className="flex items-center gap-2 bg-slate-100/50 px-3 py-1.5 rounded-full">
            <MapPin size={14} className="text-orange-500" />
            <span>{service.distance.toFixed(1)} km away</span>
          </div>
          
          {service.category === 'Properties' && service.listing_type && (
            <span className={`px-3 py-1.5 rounded-full shadow-sm ${
              service.listing_type === 'Rent' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {service.listing_type.toUpperCase()}
            </span>
          )}
        </div>

        {service.category === 'Properties' && (
          <div className="grid grid-cols-3 gap-3 mb-6 p-3 bg-white/50 rounded-2xl text-[10px] uppercase tracking-tighter font-black text-slate-600">
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white shadow-sm border border-slate-100">
              <span className="text-lg mb-1">🛏️</span> {service.bedrooms || 0} Rooms
            </div>
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white shadow-sm border border-slate-100">
              <span className="text-lg mb-1">🚿</span> {service.bathrooms || 0} Bath
            </div>
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white shadow-sm border border-slate-100">
              <span className="text-lg mb-1">📐</span> {service.area_sqm || 0} m²
            </div>
          </div>
        )}
        
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: service.title, text: service.description, url: window.location.href });
              } else {
                navigator.clipboard?.writeText(`${service.title} — ${service.description} | Mella Market Hub`);
              }
            }}
            className="p-3 rounded-2xl bg-white text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-all border border-slate-200 shadow-sm active:scale-95 flex-shrink-0"
            title="Share"
          >
            <Share2 size={18} />
          </button>
          {!isOwnAd && (
            <>
              <button
                onClick={handleMessage}
                className="flex-1 bg-white text-slate-700 py-3 px-4 rounded-2xl hover:bg-slate-50 transition-all border border-slate-200 shadow-sm flex items-center justify-center gap-2 font-bold text-sm active:scale-95"
              >
                <MessageCircle size={18} />
                Chat
              </button>
              <button
                onClick={handleBook}
                className="flex-[1.5] premium-gradient-orange text-white py-3 px-4 rounded-2xl hover:opacity-90 transition-all font-bold text-sm shadow-lg shadow-orange-200 active:scale-95"
              >
                Book Now
              </button>
            </>
          )}
          
          {isOwnAd && (
            <div className="w-full text-center py-3 px-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl font-bold text-sm">
              ✨ This is your listing
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
