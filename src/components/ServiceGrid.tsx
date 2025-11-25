
import React from 'react';
import { ServiceCard } from './ServiceCard';

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
    is_verified?: boolean;
    badges?: string[];
  };
}

interface ServiceGridProps {
  services: Service[];
  onBook?: (service: Service) => void;
  onMessage?: (userId: string, userName: string) => void;
  onUserProfileClick?: (userId: string) => void;
  onPostClick?: (service: Service) => void;
}

export const ServiceGrid: React.FC<ServiceGridProps> = ({ 
  services, 
  onBook, 
  onMessage, 
  onUserProfileClick,
  onPostClick
}) => {
  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-gray-600 mb-2">No services found</h3>
        <p className="text-gray-500">Try adjusting your filters or search terms</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          onBook={onBook}
          onMessage={onMessage}
          onUserProfileClick={onUserProfileClick}
          onPostClick={onPostClick}
        />
      ))}
    </div>
  );
};
