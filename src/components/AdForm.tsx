
import React, { useState } from 'react';
import { X, Upload, MapPin, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdFormProps {
  onClose: () => void;
  userLocation?: { lat: number; lng: number }; // Now optional, will use LocationContext
  onAdAdded: (ad: any) => void;
  adToEdit?: {
    id: string;
    title: string;
    description: string;
    category: string;
    price: number;
    image_url?: string | null;
  };
  onAdUpdated?: (ad: any) => void;
}

const serviceCategories = [
  'Cleaning', 'Delivery', 'Tech Support', 'Home Repair', 'Tutoring',
  'Photography', 'Catering', 'Transportation', 'Beauty', 'Fitness',
  'Community Help', 'Safety Alert'
];

const productCategories = [
  'Electronics', 'Furniture', 'Clothing', 'Books', 'Sports Equipment',
  'Musical Instruments', 'Home Appliances', 'Vehicles', 'Tools', 'Other'
];

export const AdForm: React.FC<AdFormProps> = ({ onClose, userLocation: propLocation, onAdAdded, adToEdit, onAdUpdated }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { location: contextLocation, loading: locationLoading, error: locationError, permissionStatus, requestPermission } = useLocation();

  // Use context location if available, otherwise fall back to prop location
  const userLocation = contextLocation || propLocation || { lat: 9.0257, lng: 38.7468 };
  const [formData, setFormData] = useState({
    title: adToEdit?.title || '',
    description: adToEdit?.description || '',
    category: adToEdit?.category || serviceCategories[0],
    price: adToEdit ? String(adToEdit.price) : '',
    type: 'service' as 'service' | 'sell' | 'rent'
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(adToEdit?.image_url || '');
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    // Use existing 'avatars' bucket with RLS requiring userId prefix
    const objectPath = `${user.id}/ads/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(objectPath, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(objectPath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      let imageUrl = imagePreview || null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      if (adToEdit) {
        const { data, error } = await supabase
          .from('ads')
          .update({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            price: parseFloat(formData.price),
            image_url: imageUrl,
          })
          .eq('id', adToEdit.id)
          .select()
          .single();

        if (error) throw error;

        toast({ title: 'Success!', description: 'Your post has been updated.' });
        onAdUpdated?.(data);
        onClose();
        return;
      }

      const { data, error } = await supabase
        .from('ads')
        .insert([
          {
            user_id: user.id,
            title: formData.title,
            description: formData.description,
            category: formData.category,
            price: parseFloat(formData.price),
            image_url: imageUrl,
            location_lat: userLocation.lat,
            location_lng: userLocation.lng,
            ad_type: formData.type
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: 'Success!',
        description: `Your ${formData.type === 'service' ? 'service' : formData.type === 'sell' ? 'product for sale' : 'rental item'} has been posted successfully.`,
      });

      onAdAdded(data);
      onClose();
    } catch (error) {
      console.error('Error posting/updating ad:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your ad. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentCategories = () => {
    return formData.type === 'service' ? serviceCategories : productCategories;
  };

  const getFormTitle = () => {
    if (adToEdit) return 'Edit Post';
    switch (formData.type) {
      case 'service': return 'Post a Service';
      case 'sell': return 'Sell a Product';
      case 'rent': return 'Rent a Product';
      default: return 'Create Post';
    }
  };

  const getPricePlaceholder = () => {
    switch (formData.type) {
      case 'service': return 'Service price (ETB)';
      case 'sell': return 'Selling price (ETB)';
      case 'rent': return 'Rental price per day (ETB)';
      default: return '0.00';
    }
  };

  const handleTypeChange = (newType: 'service' | 'sell' | 'rent') => {
    const newCategories = newType === 'service' ? serviceCategories : productCategories;
    setFormData({
      ...formData,
      type: newType,
      category: newCategories[0]
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">{getFormTitle()}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What would you like to post?
            </label>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => handleTypeChange('service')}
                className={`p-4 rounded-xl border-2 transition-all ${formData.type === 'service'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">🔧</div>
                  <div className="font-semibold">Service</div>
                  <div className="text-xs text-gray-500">Offer your skills</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('sell')}
                className={`p-4 rounded-xl border-2 transition-all ${formData.type === 'sell'
                  ? 'border-green-500 bg-green-50 text-green-700 shadow-md'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">💰</div>
                  <div className="font-semibold">Sell</div>
                  <div className="text-xs text-gray-500">Sell your items</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('rent')}
                className={`p-4 rounded-xl border-2 transition-all ${formData.type === 'rent'
                  ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">📅</div>
                  <div className="font-semibold">Rent</div>
                  <div className="text-xs text-gray-500">Rent your items</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.type === 'service' ? 'Service Title' : 'Product Title'}
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder={formData.type === 'service' ? 'e.g., Professional House Cleaning' : 'e.g., iPhone 13 Pro Max'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder={formData.type === 'service' ? 'Describe your service in detail...' : 'Describe your product, condition, etc...'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                {getCurrentCategories().map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price {formData.type === 'rent' && '(per day)'}
              </label>
              <div className="relative">
                <DollarSign size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder={getPricePlaceholder()}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.type === 'service' ? 'Service Image' : 'Product Image'}
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="mx-auto h-32 w-full object-cover rounded-lg"
                  />
                ) : (
                  <>
                    <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">Click to upload an image</p>
                    <p className="text-sm text-gray-400">PNG, JPG up to 10MB</p>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className={`p-4 rounded-lg flex items-start gap-3 ${permissionStatus === 'granted' ? 'bg-green-50' :
            permissionStatus === 'denied' ? 'bg-red-50' : 'bg-blue-50'
            }`}>
            {permissionStatus === 'granted' ? (
              <CheckCircle2 size={20} className="text-green-500 mt-0.5" />
            ) : permissionStatus === 'denied' ? (
              <AlertCircle size={20} className="text-red-500 mt-0.5" />
            ) : (
              <MapPin size={20} className="text-blue-500 mt-0.5" />
            )}
            <div className="flex-1">
              {permissionStatus === 'granted' ? (
                <>
                  <h4 className="font-medium text-green-900">Location Enabled ✓</h4>
                  <p className="text-sm text-green-700">
                    Your {formData.type === 'service' ? 'service' : 'product'} will be posted with your current location and visible to users within 5km.
                  </p>
                </>
              ) : permissionStatus === 'denied' ? (
                <>
                  <h4 className="font-medium text-red-900">Location Access Denied</h4>
                  <p className="text-sm text-red-700 mb-2">
                    Using default location (Addis Ababa). Enable location access in your browser settings for accurate positioning.
                  </p>
                  <button
                    type="button"
                    onClick={requestPermission}
                    className="text-sm text-red-600 underline hover:text-red-800"
                  >
                    Request Location Access
                  </button>
                </>
              ) : (
                <>
                  <h4 className="font-medium text-blue-900">Location Information</h4>
                  <p className="text-sm text-blue-700">
                    {locationLoading ? 'Getting your location...' :
                      `Your ${formData.type === 'service' ? 'service' : 'product'} will be visible to users within 5km of your location.`}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (adToEdit ? 'Updating...' : 'Posting...') : (adToEdit ? 'Update Post' : `Post ${formData.type === 'service' ? 'Service' : formData.type === 'sell' ? 'for Sale' : 'for Rent'}`)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
