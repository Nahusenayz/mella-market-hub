
import React, { useState } from 'react';
import { X, MapPin, Share2, Heart, ChevronLeft, ChevronRight, BedDouble, Bath, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
  // Simulate multiple images for carousel effect
  const images = [post.image, post.image, post.image];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden bg-white rounded-3xl h-[85vh] flex flex-col">

        {/* Header / Image Carousel */}
        <div className="relative h-72 bg-gray-100 shrink-0 group">
          <img
            src={images[currentImageIndex]}
            alt={post.title}
            className="w-full h-full object-cover"
          />

          {/* Top Actions */}
          <div className="absolute top-4 left-4 z-10">
            <button onClick={onClose} className="bg-white/90 p-2 rounded-full shadow-sm hover:bg-white transition-colors">
              <ChevronLeft size={24} className="text-gray-800" />
            </button>
          </div>

          <div className="absolute top-4 right-4 z-10 flex gap-3">
            <button className="bg-white/90 p-2 rounded-full shadow-sm hover:bg-white transition-colors">
              <Share2 size={20} className="text-gray-800" />
            </button>
            <button className="bg-white/90 p-2 rounded-full shadow-sm hover:bg-white transition-colors">
              <Heart size={20} className="text-gray-800" />
            </button>
          </div>

          {/* Carousel Controls */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={prevImage} className="bg-black/20 p-1 rounded-full text-white hover:bg-black/30">
              <ChevronLeft size={24} />
            </button>
            <button onClick={nextImage} className="bg-black/20 p-1 rounded-full text-white hover:bg-black/30">
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Dots Indicator */}
          <div className="absolute bottom-4 inset-x-0 flex justify-center gap-1.5">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Thumbnail Strip */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 snap-x">
            {images.map((img, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={`w-20 h-16 rounded-lg overflow-hidden shrink-0 border-2 cursor-pointer snap-start transition-all ${idx === currentImageIndex ? 'border-orange-500' : 'border-transparent'}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>

          {/* Price & Title */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {Number(post.price).toLocaleString()} <span className="text-lg font-medium text-gray-600">ETB/month</span>
            </h2>
            <h3 className="text-lg font-medium text-gray-800 line-clamp-2">{post.title}</h3>
          </div>

          {/* Key Features */}
          <div className="flex gap-6 mb-6 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <BedDouble className="text-gray-500" size={24} />
              <div>
                <div className="font-bold text-gray-900">2</div>
                <div className="text-xs text-gray-500">Bedrooms</div>
              </div>
            </div>
            <div className="flex flex-col border-r border-gray-100 h-8 self-center" />
            <div className="flex items-center gap-2">
              <Bath className="text-gray-500" size={20} />
              <div>
                <div className="font-bold text-gray-900">2</div>
                <div className="text-xs text-gray-500">Bathrooms</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-gray-600 leading-relaxed text-sm">
              {post.description}
            </p>
          </div>

          {/* Verified Badge */}
          {post.profiles?.is_verified && (
            <div className="flex items-center gap-2 text-green-700 font-semibold mb-6 bg-green-50 p-2 rounded-lg w-fit">
              <ShieldCheck className="fill-green-700 text-white" size={20} />
              Verified Listing
            </div>
          )}

          {/* Agent Card */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-24">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 shrink-0">
              {post.profiles?.profile_image_url ? (
                <img src={post.profiles.profile_image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl bg-gray-300">
                  {post.provider[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900 truncate">{post.provider}</div>
              <div className="text-sm text-gray-500">Building trust</div>
            </div>
            {/* Action buttons inside card if needed, or kept at bottom */}
          </div>
        </div>

        {/* Fixed Bottom Action Bar */}
        <div className="p-4 border-t bg-white absolute bottom-0 inset-x-0 z-20">
          <button
            onClick={onMessage}
            className="w-full bg-[#1e3a8a] text-white font-bold py-3.5 rounded-xl hover:bg-[#172554] transition-colors shadow-lg shadow-blue-900/10 active:scale-[0.98] transform"
          >
            Contact Agent
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
};
