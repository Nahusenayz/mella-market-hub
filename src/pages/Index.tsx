import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { SearchHero } from '@/components/SearchHero';
import { CategoryFilter } from '@/components/CategoryFilter';
import { DistanceFilter } from '@/components/DistanceFilter';
import { ServiceGrid } from '@/components/ServiceGrid';
import { MapView } from '@/components/MapView';
import { SearchBar } from '@/components/SearchBar';
import { BookingModal } from '@/components/BookingModal';
import { MessageThread } from '@/components/MessageThread';
import { UserProfileModal } from '@/components/UserProfile';
import { AdForm } from '@/components/AdForm';
import { PostModal } from '@/components/PostModal';
import { Footer } from '@/components/Footer';
import { TowTruckFlow } from '@/components/TowTruckFlow';
import { useRealTimeAds } from '@/hooks/useRealTimeAds';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { List, MapPin, Plus, AlertTriangle, Shield, HeartPulse, MessageSquarePlus, Activity, Truck } from 'lucide-react';
import { useWorkerLocations } from '@/hooks/useWorkerLocations';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocation as useLocationContext } from '@/contexts/LocationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

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
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number;
  is_furnished?: boolean;
  listing_type?: string;
}

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const Index = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { location: userLocation } = useLocationContext(); // Get location from context
  const { ads, loading, searchAds } = useRealTimeAds();
  const [selectedCategory, setSelectedCategory] = useLocalStorage('selectedCategory', 'all');
  const [distanceFilter, setDistanceFilter] = useLocalStorage('distanceFilter', 5); // Default to 5km max
  const [viewMode, setViewMode] = useLocalStorage('viewMode', 'list');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedPost, setSelectedPost] = useState<Service | null>(null);
  const [selectedMessageUser, setSelectedMessageUser] = useState<{
    id: string;
    name: string;
    image?: string;
    initialMessage?: string;
  } | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdForm, setShowAdForm] = useState(false);
  const [showTowTruck, setShowTowTruck] = useState(false);
  const [editAd, setEditAd] = useState<Service | null>(null);
  const { workers: responders } = useWorkerLocations();
  const onlineResponders = responders.length;

  // Default location fallback
  const currentLocation = userLocation || { lat: 9.0320, lng: 38.7469 };

  // Check if we need to open ad form from navigation state
  useEffect(() => {
    if (location.state?.openAdForm) {
      setShowAdForm(true);
      // Clear the state to prevent reopening on refresh
      navigate('/', { replace: true });
    }
  }, [location.state, navigate]);



  // Memoized transformation of ads data to match Service interface
  const services = React.useMemo(() => {
    return ads.map(ad => {
      const distance = ad.location_lat && ad.location_lng
        ? calculateDistance(currentLocation.lat, currentLocation.lng, ad.location_lat, ad.location_lng)
        : 0;

      return {
        id: ad.id,
        title: ad.title,
        description: ad.description,
        price: Number(ad.price),
        category: ad.category,
        provider: ad.profiles?.full_name || 'Unknown Provider',
        rating: ad.profiles?.rating || 0,
        distance: distance,
        image: ad.image_url || '/placeholder.svg',
        location: {
          lat: ad.location_lat || currentLocation.lat,
          lng: ad.location_lng || currentLocation.lng
        },
        user_id: ad.user_id,
        profiles: ad.profiles,
        property_type: ad.property_type,
        bedrooms: ad.bedrooms,
        bathrooms: ad.bathrooms,
        area_sqm: ad.area_sqm,
        is_furnished: ad.is_furnished,
        listing_type: ad.listing_type
      };
    });
  }, [ads, currentLocation.lat, currentLocation.lng]);

  const filteredServices = React.useMemo(() => {
    const searchSource = isSearching ? searchResults : services;

    // If we're searching, searchResults are already filtered/transformed from searchAds
    // But we still need to apply distance and category filters to the main ads list
    const source = isSearching
      ? searchResults.map(ad => ({
        ...ad,
        distance: ad.location_lat && ad.location_lng
          ? calculateDistance(currentLocation.lat, currentLocation.lng, ad.location_lat, ad.location_lng)
          : 0
      }))
      : services;

    return source.filter(service => {
      const categoryMatch = selectedCategory === 'all' || service.category === selectedCategory;
      const distanceMatch = service.distance <= distanceFilter;
      return categoryMatch && distanceMatch;
    });
  }, [services, isSearching, searchResults, selectedCategory, distanceFilter, currentLocation.lat, currentLocation.lng]);

  const handleSearch = async (query: string, location?: { lat: number; lng: number }, radius?: number) => {
    setIsSearching(true);
    const results = await searchAds(query, location, radius);
    setSearchResults(results);
  };

  const clearSearch = () => {
    setIsSearching(false);
    setSearchResults([]);
  };

  const handlePostClick = (service: Service) => {
    setSelectedPost(service);
  };

  const handleBookService = (service: Service) => {
    setSelectedService(service);
  };

  const handleMessageUser = (userId: string, userName: string, userImage?: string, initialMessage?: string) => {
    setSelectedMessageUser({ id: userId, name: userName, image: userImage, initialMessage });
  };

  const handleUserProfileClick = (userId: string) => {
    console.log('Opening user profile for:', userId);
    setSelectedUserProfile(userId);
  };

  const handleClosePost = () => {
    setSelectedPost(null);
  };

  const handleCloseBooking = () => {
    setSelectedService(null);
  };

  const handleCloseMessage = () => {
    setSelectedMessageUser(null);
  };

  const handleCloseUserProfile = () => {
    setSelectedUserProfile(null);
  };

  const handlePostAd = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to share a post.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }
    setShowAdForm(true);
  };

  const handleAdAdded = (newAd: any) => {
    setShowAdForm(false);
    toast({
      title: "Success!",
      description: "Your post has been shared successfully.",
    });
    // The real-time subscription will automatically update the ads list
  };

  const handleCloseAdForm = () => {
    setShowAdForm(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-orange-50 to-red-50 pb-4">
      <Navbar onPostAd={handlePostAd} />

      {!selectedMessageUser && (
        <>
          <SearchHero
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isWorkerMode={false}
            onTowTruckClick={() => setShowTowTruck(true)}
          />

          {/* Real-time Responder Stats Ticker */}
          <div className="bg-orange-600 text-white py-2 overflow-hidden whitespace-nowrap">
            <div className="flex items-center justify-center gap-8 animate-pulse">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-orange-200" />
                <span className="text-sm font-medium">{onlineResponders || 12} Responders Online in Addis Ababa</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-orange-200" />
                <span className="text-sm font-medium">Community Safety: Active</span>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-4 py-8">

            {/* Recent Safety Alerts Feed */}
            {filteredServices.some(s => s.category === 'Safety Alert') && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="text-red-600 h-6 w-6" />
                  <h2 className="text-xl font-bold text-gray-800">Recent Safety Alerts</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredServices
                    .filter(s => s.category === 'Safety Alert')
                    .slice(0, 2)
                    .map(alert => (
                      <div key={alert.id} className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => handlePostClick(alert)}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-red-800">{alert.title}</h4>
                            <p className="text-sm text-red-700 line-clamp-1">{alert.description}</p>
                          </div>
                          <Badge variant="destructive" className="text-[10px] py-0 px-1">URGENT</Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-red-600">
                          <span className="flex items-center gap-1"><MapPin size={12} /> {alert.distance.toFixed(1)}km away</span>
                          <span>Click to see details</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <SearchBar
              onSearch={handleSearch}
              userLocation={currentLocation}
            />

            {isSearching && (
              <div className="mb-6">
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <span className="text-blue-800">
                    {t('searchResults')} ({searchResults.length})
                  </span>
                  <button
                    onClick={clearSearch}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {t('clearSearch')}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <CategoryFilter
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                />
                <DistanceFilter
                  distanceFilter={distanceFilter}
                  onDistanceChange={setDistanceFilter}
                />
              </div>

              <div className="lg:col-span-3">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {isSearching ? t('searchResults') : t('communityPosts')}
                    <span className="text-lg font-normal text-gray-600 ml-2">
                      ({filteredServices.length} {t('postsWithinDistance')} {distanceFilter}{t('kilometers')})
                    </span>
                  </h2>

                  <div className="flex items-center gap-4">
                    {/* Post Ad Button */}
                    <button
                      onClick={handlePostAd}
                      className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 font-medium"
                    >
                      <Plus size={16} />
                      <span className="hidden sm:inline">{t('sharePost')}</span>
                    </button>

                    {/* 3D Map Button */}
                    <button
                      onClick={() => navigate('/map3d')}
                      className="bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium"
                    >
                      <MapPin size={16} />
                      <span className="hidden sm:inline">{t('map3D') || '3D Map'}</span>
                    </button>

                    <div className="flex bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                          viewMode === 'list'
                            ? 'bg-orange-500 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <List size={20} />
                        <span className="hidden sm:inline">List</span>
                      </button>
                      <button
                        onClick={() => setViewMode('map')}
                        className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                          viewMode === 'map'
                            ? 'bg-orange-500 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <MapPin size={20} />
                        <span className="hidden sm:inline">Map</span>
                      </button>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">{t('loadingPosts')}</p>
                  </div>
                ) : (
                  <>
                    {viewMode === 'list' ? (
                      <ServiceGrid
                        services={filteredServices}
                        loading={loading}
                        onBook={handleBookService}
                        onMessage={handleMessageUser}
                        onUserProfileClick={handleUserProfileClick}
                        onPostClick={handlePostClick}
                      />
                    ) : (
                      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden h-[600px] mb-8 sticky top-24">
                        <MapView 
                          services={filteredServices} 
                          userLocation={currentLocation} 
                          distanceFilter={distanceFilter} 
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {selectedMessageUser && (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <MessageThread
              otherUserId={selectedMessageUser.id}
              otherUserName={selectedMessageUser.name}
              otherUserImage={selectedMessageUser.image}
              initialMessage={selectedMessageUser.initialMessage}
              onBack={handleCloseMessage}
            />
          </div>
        </div>
      )}

      {selectedPost && (
        <PostModal
          isOpen={!!selectedPost}
          onClose={handleClosePost}
          post={selectedPost}
          onBook={() => {
            handleClosePost();
            handleBookService(selectedPost);
          }}
          onMessage={() => {
            handleClosePost();
            handleMessageUser(
              selectedPost.user_id, 
              selectedPost.provider, 
              selectedPost.profiles?.profile_image_url,
              `Hi, I'm interested in your post: ${selectedPost.title}. Is it still available?`
            );
          }}
          onEdit={user?.id === selectedPost.user_id ? () => {
            setEditAd(selectedPost);
            handleClosePost();
          } : undefined}
        />
      )}

      {selectedService && (
        <BookingModal
          service={selectedService}
          workerId={selectedService.user_id}
          onClose={handleCloseBooking}
        />
      )}

      {selectedUserProfile && (
        <UserProfileModal
          userId={selectedUserProfile}
          onClose={handleCloseUserProfile}
          onMessage={handleMessageUser}
        />
      )}

      {showAdForm && (
        <AdForm
          onClose={handleCloseAdForm}
          userLocation={currentLocation}
          onAdAdded={handleAdAdded}
        />
      )}

      {editAd && (
        <AdForm
          onClose={() => setEditAd(null)}
          userLocation={currentLocation}
          onAdAdded={() => { }}
          adToEdit={{
            id: editAd.id,
            title: editAd.title,
            description: editAd.description,
            category: editAd.category,
            price: editAd.price,
            image_url: editAd.image,
          }}
          onAdUpdated={() => {
            setEditAd(null);
            toast({ title: 'Success!', description: 'Post updated successfully.' });
          }}
        />
      )}

      {showTowTruck && (
        <TowTruckFlow
          userLocation={currentLocation}
          onClose={() => setShowTowTruck(false)}
        />
      )}

      <Footer />

      {/* Floating SOS Button - Smaller */}
      <button
        onClick={() => navigate('/emergency')}
        className="fixed bottom-4 right-4 z-50 bg-red-600 text-white p-3 rounded-full shadow-2xl hover:bg-red-700 transition-all hover:scale-110 animate-emergency-pulse flex items-center justify-center gap-1.5 group"
      >
        <AlertTriangle className="h-6 w-6" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 font-bold text-xs">
          SOS
        </span>
      </button>
    </div>
  );
};

export default Index;
