import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { SearchHero } from '@/components/SearchHero';
import { CategoryFilter } from '@/components/CategoryFilter';
import { DistanceFilter } from '@/components/DistanceFilter';
import { ServiceGrid } from '@/components/ServiceGrid';
import { SearchBar } from '@/components/SearchBar';
import { BookingModal } from '@/components/BookingModal';
import { MessageThread } from '@/components/MessageThread';
import { UserProfileModal } from '@/components/UserProfile';
import { AdForm } from '@/components/AdForm';
import { PostModal } from '@/components/PostModal';
import { Footer } from '@/components/Footer';
import { TowTruckFlow } from '@/components/TowTruckFlow';
import { AIServiceSuggestions } from '@/components/AIServiceSuggestions';
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
import { calculateDistanceKm, getAdDistanceKm } from '@/lib/utils';
import { DEFAULT_LOCATION } from '@/lib/defaultLocation';
import { isInCrimeZone, getSeverityLabel, getSeverityColor } from '@/hooks/crimeData';

const LazyMapView = React.lazy(() =>
  import('@/components/MapViewGoogle').then((mod) => ({ default: mod.MapView }))
);

const LazyCommunitySafetyFeed = React.lazy(() =>
  import('@/components/CommunitySafetyFeed').then((mod) => ({ default: mod.CommunitySafetyFeed }))
);

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  provider: string;
  rating: number;
  distance: number;
  hasLocation?: boolean;
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

const Index = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { location: userLocation } = useLocationContext(); // Get location from context
  const { ads, loading, searchAds } = useRealTimeAds();
  const [selectedCategory, setSelectedCategory] = useLocalStorage('selectedCategory', 'all');
  const [distanceFilter, setDistanceFilter] = useLocalStorage('distanceFilter', 25); // Default to 25km radius
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
  const currentLocation = userLocation || DEFAULT_LOCATION;

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = await searchAds(query);
    setSearchResults(results);
  };

  const clearSearch = () => {
    setIsSearching(false);
    setSearchResults([]);
  };

  // Memoized transformation of ads data to match Service interface
  const services = React.useMemo(() => {
    return ads.map(ad => {
      const distance = getAdDistanceKm(currentLocation, ad.location_lat, ad.location_lng);

      return {
        id: ad.id,
        title: ad.title,
        description: ad.description,
        price: Number(ad.price),
        category: ad.category,
        provider: ad.profiles?.full_name || 'Unknown Provider',
        rating: ad.profiles?.rating || 0,
        distance: distance ?? 0,
        hasLocation: distance != null,
        image: ad.image_url || '/placeholder.svg',
        location: {
          lat: Number(ad.location_lat) || currentLocation.lat,
          lng: Number(ad.location_lng) || currentLocation.lng
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
    const source = isSearching
      ? searchResults.map(ad => {
        const distance = getAdDistanceKm(currentLocation, ad.location_lat, ad.location_lng);
        return {
          ...ad,
          distance: distance ?? 0,
          hasLocation: distance != null,
        };
      })
      : services;

    const categoryFiltered = source.filter(service => {
      return selectedCategory === 'all' || service.category === selectedCategory;
    });

    if (distanceFilter >= 100) {
      return categoryFiltered;
    }

    const withinRadius = categoryFiltered.filter(service => {
      if (!service.hasLocation) return true;
      return service.distance <= distanceFilter;
    });

    // If nothing is within the selected radius, show all community posts sorted by distance
    if (withinRadius.length === 0 && categoryFiltered.length > 0) {
      return [...categoryFiltered].sort((a, b) => {
        if (!a.hasLocation && !b.hasLocation) return 0;
        if (!a.hasLocation) return 1;
        if (!b.hasLocation) return -1;
        return a.distance - b.distance;
      });
    }

    return withinRadius;
  }, [services, isSearching, searchResults, selectedCategory, distanceFilter, currentLocation.lat, currentLocation.lng]);

  const nearbyPostCount = React.useMemo(() => {
    if (distanceFilter >= 100) return filteredServices.length;
    return filteredServices.filter(service => !service.hasLocation || service.distance <= distanceFilter).length;
  }, [filteredServices, distanceFilter]);

  const responderCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    responders.forEach(r => {
      const cat = r.category;
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [responders]);
  const emergencyInsights = React.useMemo(() => {
    const categories = ['police', 'traffic_police', 'ambulance', 'fire_truck', 'tow_truck'];
    return categories.reduce((acc, category) => {
      const matches = responders.filter(r => r.category === category);
      const nearest = matches
        .map(worker => ({
          ...worker,
          distance: calculateDistanceKm(
            currentLocation.lat,
            currentLocation.lng,
            worker.location_lat,
            worker.location_lng
          )
        }))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))[0];

      const etaMinutes = nearest
        ? Math.max(2, Math.round(((nearest.distance || 0) / 35) * 60))
        : null;

      acc[category] = {
        count: matches.length,
        etaLabel: matches.length > 0
          ? `ETA ~${etaMinutes} min`
          : 'Station fallback ready',
        statusLabel: matches.length > 1
          ? 'Online now'
          : matches.length === 1
            ? 'Closest available'
            : '0 responders online'
      };
      return acc;
    }, {} as Record<string, { count: number; etaLabel: string; statusLabel: string }>);
  }, [responders, currentLocation.lat, currentLocation.lng]);
  const [dismissedCrimeAlert, setDismissedCrimeAlert] = useState(false);

  const crimeZone = isInCrimeZone(currentLocation.lat, currentLocation.lng);
  const showCrimeAlert = crimeZone && !dismissedCrimeAlert && crimeZone.severity !== 'low';

  // Check if we need to open ad form from navigation state
  useEffect(() => {
    if (location.state?.openAdForm) {
      setShowAdForm(true);
      // Clear the state to prevent reopening on refresh
      navigate('/', { replace: true });
    }
  }, [location.state, navigate]);

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
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-orange-50 to-red-50 dark:from-slate-900 dark:to-slate-900 dark:bg-slate-900 pb-4 overflow-x-hidden">
      <Navbar onPostAd={handlePostAd} />

      {!selectedMessageUser && (
        <>
          <SearchHero
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isWorkerMode={false}
            onTowTruckClick={() => setShowTowTruck(true)}
            responderCounts={responderCounts}
            emergencyInsights={emergencyInsights}
          />

          <div className="container mx-auto px-4 mt-4">
            <React.Suspense fallback={<div className="rounded-lg bg-white p-4 text-sm text-gray-500 shadow-sm">Loading safety feed...</div>}>
              <LazyCommunitySafetyFeed userLocation={currentLocation} />
            </React.Suspense>
          </div>

          {/* Real-time Responder Stats Ticker */}
          <div className="bg-orange-600 text-white py-2 overflow-hidden whitespace-nowrap">
            <div className="flex items-center justify-center gap-8 animate-pulse">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-orange-200" />
                <span className="text-sm font-medium">{t('respondersOnline', { count: onlineResponders || 12 })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-orange-200" />
                <span className="text-sm font-medium">{t('communitySafetyActive')}</span>
              </div>
            </div>
          </div>

          {/* Crime Zone Alert */}
          {showCrimeAlert && crimeZone && (
            <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white">
              <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm font-medium">
                    <strong>{getSeverityLabel(crimeZone.severity)}</strong> — {crimeZone.label}.{' '}
                    <span className="text-red-100">{crimeZone.incidents} recent incidents reported.</span>
                    {' '}<span className="underline cursor-pointer" onClick={() => navigate('/emergency')}>Stay safe</span>
                  </p>
                </div>
                <button
                  onClick={() => setDismissedCrimeAlert(true)}
                  className="text-white/80 hover:text-white flex-shrink-0"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="container mx-auto px-4 py-8">

            {/* Recent Safety Alerts Feed */}
            {filteredServices.some(s => s.category === 'Safety Alert') && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="text-red-600 h-6 w-6" />
                  <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">Recent Safety Alerts</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredServices
                    .filter(s => s.category === 'Safety Alert')
                    .slice(0, 2)
                    .map(alert => (
                      <div key={alert.id} className="bg-red-50 dark:bg-red-950 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => handlePostClick(alert)}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-red-800 dark:text-red-300">{alert.title}</h4>
                            <p className="text-sm text-red-700 dark:text-red-400 line-clamp-1">{alert.description}</p>
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
                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <span className="text-blue-800 dark:text-blue-300">
                    {t('searchResults')} ({searchResults.length})
                  </span>
                  <button
                    onClick={clearSearch}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium"
                  >
                    {t('clearSearch')}
                  </button>
                </div>
              </div>
            )}

            {selectedCategory !== 'all' && (
              <AIServiceSuggestions category={selectedCategory} listingTitles={ads.filter(a => a.category === selectedCategory).map(a => a.title)} />
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
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
                    {isSearching ? t('searchResults') : t('communityPosts')}
                    <span className="text-lg font-normal text-gray-600 dark:text-slate-400 ml-2">
                      ({nearbyPostCount} {t('postsWithinDistance')} {distanceFilter}{t('kilometers')}
                      {nearbyPostCount === 0 && filteredServices.length > 0 && !isSearching && (
                        <span>{` · showing ${filteredServices.length} community posts`}</span>
                      )}
                      )
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
                      className="bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-2 font-medium"
                    >
                      <MapPin size={16} />
                      <span className="hidden sm:inline">{t('map3D') || '3D Map'}</span>
                    </button>

                    <div className="flex bg-white dark:bg-slate-700 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-slate-600">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                          viewMode === 'list'
                            ? 'bg-orange-500 text-white'
                            : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600'
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
                            : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600'
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
                    <p className="mt-4 text-gray-600 dark:text-slate-300">{t('loadingPosts')}</p>
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
                      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden h-[600px] mb-8 sticky top-24">
                        <React.Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-gray-500">Loading map...</div>}>
                          <LazyMapView 
                            services={filteredServices} 
                            userLocation={currentLocation} 
                            distanceFilter={distanceFilter} 
                          />
                        </React.Suspense>
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
        <div className="container mx-auto px-4 py-8 dark:text-slate-100">
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
