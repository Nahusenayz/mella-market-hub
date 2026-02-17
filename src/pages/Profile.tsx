import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { User, Star, MapPin, Edit, Plus, Award, Phone, Mail, Home, Camera, Briefcase, Clock, Check, X, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProfileEdit } from '@/components/ProfileEdit';
import { AdForm } from '@/components/AdForm';
import { VerificationBadge } from '@/components/VerificationBadge';
import { useBookingTracking } from '@/hooks/useBookingTracking';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  bio: string;
  rating: number;
  total_ratings: number;
  profile_image_url: string;
  user_type: string;
}

interface UserAd {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  image_url: string;
  is_active: boolean;
  created_at: string;
  ad_type: string;
}

interface Certification {
  id: string;
  title: string;
  institution: string;
  description: string;
  issue_date: string;
  expiry_date: string;
  certificate_image_url: string;
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { location: userLocationFromContext } = useLocation(); // Get location from context
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userAds, setUserAds] = useState<UserAd[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('ads');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAdForm, setShowAdForm] = useState(false);
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [hidePhone, setHidePhone] = useState(false);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);

  // Worker dashboard hooks
  const { activeBookings, updateBookingStatus } = useBookingTracking();

  // Use real user location from context or fallback to Addis Ababa
  const userLocation = userLocationFromContext || { lat: 9.0320, lng: 38.7469 };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchUserData();

    // Get last sign in from session
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user.last_sign_in_at) {
        setLastSignIn(data.session.user.last_sign_in_at);
      }
    };
    getSession();
  }, [user, navigate]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else {
        setProfile(profileData);
      }

      // Fetch user ads - now including ad_type
      const { data: adsData, error: adsError } = await supabase
        .from('ads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (adsError) {
        console.error('Error fetching ads:', adsError);
      } else {
        setUserAds(adsData || []);
      }

      // Fetch certifications
      const { data: certsData, error: certsError } = await supabase
        .from('certifications')
        .select('*')
        .eq('user_id', user.id)
        .order('issue_date', { ascending: false });

      if (certsError) {
        console.error('Error fetching certifications:', certsError);
      } else {
        setCertifications(certsData || []);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadProfileImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 10MB.",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a valid image file (JPEG, PNG, GIF, or WebP).",
          variant: "destructive",
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      // Prefix with user id to satisfy avatars bucket RLS policies
      const filePath = `${user?.id}/profile-images/${fileName}`;

      console.log('Uploading profile image to path:', filePath);

      // Upload to the 'avatars' bucket (created by migration). Do not fallback to non-existent buckets
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // Surface helpful message when bucket missing
        if ((uploadError as any)?.message?.includes('Bucket not found')) {
          throw new Error("Storage bucket 'avatars' not found. Run the Supabase migrations to create it.");
        }
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          profile_image_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      setProfile(prev => prev ? { ...prev, profile_image_url: publicUrl } : null);

      toast({
        title: "Success",
        description: "Profile image updated successfully!",
      });

      console.log('Profile image updated successfully:', publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload profile image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAddCertification = () => {
    navigate('/add-certification');
  };

  const handleProfileUpdated = (updatedProfile: any) => {
    setProfile(updatedProfile);
  };

  const getAdTypeBadge = (adType: string) => {
    switch (adType) {
      case 'service':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Service</span>;
      case 'sell':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">For Sale</span>;
      case 'rent':
        return <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">For Rent</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Service</span>;
    }
  };

  const handlePostNewAd = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to post an ad.",
        variant: "destructive",
      });
      return;
    }
    setShowAdForm(true);
  };

  const handleAdAdded = (newAd: any) => {
    setShowAdForm(false);
    setUserAds(prev => [newAd, ...prev]);
    toast({
      title: "Success!",
      description: "Your ad has been posted successfully.",
    });
  };

  const handleCloseAdForm = () => {
    setShowAdForm(false);
  };

  // Worker dashboard functions
  const handleAcceptBooking = async (bookingId: string) => {
    await updateBookingStatus(bookingId, 'accepted');
    toast({
      title: "Booking Accepted",
      description: "You have accepted the booking request.",
    });
  };

  const handleRejectBooking = async (bookingId: string) => {
    await updateBookingStatus(bookingId, 'rejected');
    toast({
      title: "Booking Rejected",
      description: "You have rejected the booking request.",
    });
  };

  const handleStartTrip = async (bookingId: string) => {
    await updateBookingStatus(bookingId, 'en_route', userLocation);
    setIsLocationSharing(true);
    toast({
      title: "Trip Started",
      description: "Your location is now being shared with the customer.",
    });
  };

  const toggleLocationSharing = () => {
    setIsLocationSharing(!isLocationSharing);
    if (!isLocationSharing) {
      toast({
        title: "Location Sharing Enabled",
        description: "Your location will be shared with customers during active bookings.",
      });
    } else {
      toast({
        title: "Location Sharing Disabled",
        description: "Location sharing has been turned off.",
      });
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const isWorker = profile?.user_type === 'worker';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-green-50 to-emerald-50 pb-4">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-green-600">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg transition-colors"
            >
              <Home size={20} />
              <span className="font-medium">Home</span>
            </button>
            <h1 className="text-xl font-bold text-gray-800">My Profile</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="relative">
              {profile?.profile_image_url ? (
                <img
                  src={profile.profile_image_url}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-green-200"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-green-100 flex items-center justify-center border-4 border-green-200">
                  <User size={48} className="text-green-600" />
                </div>
              )}

              {/* Upload Button */}
              <label className="absolute bottom-0 right-0 bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition-colors cursor-pointer">
                {uploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Camera size={16} />
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={uploadProfileImage}
                  disabled={uploading}
                />
              </label>
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-800">
                      {profile?.full_name || 'User Name'}
                    </h1>
                    <VerificationBadge isVerified={true} badges={['certified', 'top_rated']} size="lg" />
                    {isWorker && (
                      <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full font-medium flex items-center gap-1">
                        <Briefcase size={14} />
                        Worker
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 mb-4">
                    <div className="bg-green-50 px-3 py-1 rounded-full text-xs font-medium text-green-700 flex items-center gap-1">
                      <Clock size={12} />
                      Member since {user?.created_at ? new Date(user.created_at).getFullYear() : '2024'}
                    </div>
                    <div className="bg-blue-50 px-3 py-1 rounded-full text-xs font-medium text-blue-700 flex items-center gap-1">
                      <Briefcase size={12} />
                      {userAds.length} Ads Posted
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    {profile?.rating && profile.rating > 0 ? (
                      <div className="flex items-center gap-1">
                        <Star size={20} className="text-yellow-500 fill-current" />
                        <span className="font-medium">{profile.rating.toFixed(1)}</span>
                        <span className="text-gray-500">({profile.total_ratings} reviews)</span>
                      </div>
                    ) : (
                      <span className="text-gray-500">No ratings yet</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setShowEditProfile(true)}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Edit size={16} />
                  Edit Profile
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail size={16} />
                  <span>{user?.email}</span>
                </div>
                {profile?.phone_number && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={16} />
                    <span>{profile.phone_number}</span>
                  </div>
                )}
              </div>

              {profile?.bio && (
                <p className="text-gray-700">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Worker Dashboard Location Control */}
        {isWorker && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Worker Controls</h2>
                <p className="text-gray-600">Manage your service availability and location sharing</p>
              </div>
              <button
                onClick={toggleLocationSharing}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isLocationSharing
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-500 text-white hover:bg-gray-600'
                  }`}
              >
                <MapPin size={16} />
                {isLocationSharing ? 'Location Sharing On' : 'Enable Location Sharing'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('ads')}
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === 'ads'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                My Ads ({userAds.length})
              </button>
              <button
                onClick={() => setActiveTab('certifications')}
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === 'certifications'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                Certifications ({certifications.length})
              </button>
              {isWorker && (
                <button
                  onClick={() => setActiveTab('worker-dashboard')}
                  className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === 'worker-dashboard'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  Worker Dashboard ({activeBookings.length})
                </button>
              )}
              <button
                onClick={() => setActiveTab('security')}
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === 'security'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                Security & Privacy
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'ads' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">My Ads</h2>
                  <button
                    onClick={handlePostNewAd}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Post New Ad
                  </button>
                </div>

                {userAds.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📝</div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No ads posted yet</h3>
                    <p className="text-gray-600 mb-4">Start by posting your first ad!</p>
                    <button
                      onClick={handlePostNewAd}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Plus size={16} />
                      Post Your First Ad
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userAds.map((ad) => (
                      <div key={ad.id} className="bg-gray-50 rounded-lg p-4 border">
                        {ad.image_url && (
                          <img
                            src={ad.image_url}
                            alt={ad.title}
                            className="w-full h-32 object-cover rounded-lg mb-3"
                          />
                        )}
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-800">{ad.title}</h3>
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-1 rounded-full text-xs ${ad.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                              {ad.is_active ? 'Active' : 'Inactive'}
                            </span>
                            {getAdTypeBadge(ad.ad_type)}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{ad.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-green-600">ETB {ad.price}</span>
                          <span className="text-xs text-gray-500">{ad.category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'certifications' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Certifications</h2>
                  <button
                    onClick={handleAddCertification}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Certification
                  </button>
                </div>

                {certifications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🏆</div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No certifications yet</h3>
                    <p className="text-gray-600">Add your certificates and qualifications to build trust!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {certifications.map((cert) => (
                      <div key={cert.id} className="bg-gray-50 rounded-lg p-6 border">
                        <div className="flex items-start gap-4">
                          <div className="bg-orange-100 p-3 rounded-lg">
                            <Award size={24} className="text-orange-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 mb-1">{cert.title}</h3>
                            {cert.institution && (
                              <p className="text-gray-600 mb-2">{cert.institution}</p>
                            )}
                            {cert.description && (
                              <p className="text-sm text-gray-600 mb-3">{cert.description}</p>
                            )}
                            <div className="text-xs text-gray-500">
                              {cert.issue_date && (
                                <span>Issued: {new Date(cert.issue_date).toLocaleDateString()}</span>
                              )}
                              {cert.expiry_date && (
                                <span className="ml-4">Expires: {new Date(cert.expiry_date).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Worker Dashboard Tab */}
            {isWorker && activeTab === 'worker-dashboard' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Worker Dashboard</h2>
                  <span className="text-sm text-gray-500">
                    {activeBookings.length} active request{activeBookings.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {activeBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">⏰</div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No active requests</h3>
                    <p className="text-gray-600">New service requests will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {activeBookings.map((booking) => (
                      <div key={booking.id} className="bg-gray-50 rounded-lg p-6 border">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 mb-2">{booking.ad.title}</h3>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p><strong>Customer:</strong> {booking.customer.full_name}</p>
                              <p><strong>Service Date:</strong> {booking.service_date ? new Date(booking.service_date).toLocaleDateString() : 'ASAP'}</p>
                              <p><strong>Amount:</strong> ETB {booking.ad.price.toLocaleString()}</p>
                              {booking.message && (
                                <p><strong>Message:</strong> {booking.message}</p>
                              )}
                            </div>
                          </div>

                          <div className="ml-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              booking.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                                booking.status === 'en_route' ? 'bg-purple-100 text-purple-800' :
                                  'bg-green-100 text-green-800'
                              }`}>
                              {booking.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {booking.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleAcceptBooking(booking.id)}
                                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm flex items-center gap-2"
                              >
                                <Check size={16} />
                                Accept Request
                              </button>
                              <button
                                onClick={() => handleRejectBooking(booking.id)}
                                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center gap-2"
                              >
                                <X size={16} />
                                Reject Request
                              </button>
                            </>
                          )}

                          {booking.status === 'accepted' && (
                            <button
                              onClick={() => handleStartTrip(booking.id)}
                              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors text-sm flex items-center gap-2"
                            >
                              <Navigation size={16} />
                              Start Service Trip
                            </button>
                          )}

                          {booking.status === 'en_route' && (
                            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium">
                              Service in progress - Location being shared
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs text-gray-500">
                            Requested: {new Date(booking.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Account Security</h2>
                  <div className="bg-gray-50 p-6 rounded-xl border space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-800">Password</p>
                        <p className="text-sm text-gray-600">Change your password to keep your account secure</p>
                      </div>
                      <button
                        onClick={() => navigate('/auth')} // Redirect to auth for now, or implement a specific password reset call
                        className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm"
                      >
                        Reset Password
                      </button>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">Last sign-in:</span> {lastSignIn ? new Date(lastSignIn).toLocaleString() : 'Just now'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Privacy Settings</h2>
                  <div className="bg-gray-50 p-6 rounded-xl border space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="hide-phone" className="text-base font-semibold text-gray-800">
                          Hide Phone Number
                        </Label>
                        <p className="text-sm text-gray-600">
                          Prevent other users from seeing your phone number on ads
                        </p>
                      </div>
                      <Switch
                        id="hide-phone"
                        checked={hidePhone}
                        onCheckedChange={setHidePhone}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="space-y-0.5">
                        <Label htmlFor="profile-visibility" className="text-base font-semibold text-gray-800">
                          Public Profile Visibility
                        </Label>
                        <p className="text-sm text-gray-600">
                          Allow others to search for your profile and viewing history
                        </p>
                      </div>
                      <Switch
                        id="profile-visibility"
                        defaultChecked={true}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEditProfile && profile && (
        <ProfileEdit
          profile={profile}
          onClose={() => setShowEditProfile(false)}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {showAdForm && (
        <AdForm
          onClose={handleCloseAdForm}
          userLocation={userLocation}
          onAdAdded={handleAdAdded}
        />
      )}
    </div>
  );
};

export default Profile;
