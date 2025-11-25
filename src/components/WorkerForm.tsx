
import React, { useState } from 'react';
import { X, Upload, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface WorkerFormProps {
  onClose: () => void;
  userLocation: { lat: number; lng: number };
  onServiceAdded: (service: any) => void;
}

const serviceCategories = [
  'Cleaning', 'Delivery', 'Tech Support', 'Home Repair', 'Tutoring',
  'Photography', 'Catering', 'Transportation', 'Beauty', 'Fitness'
];

const productCategories = [
  'Electronics', 'Furniture', 'Clothing', 'Books', 'Sports Equipment',
  'Musical Instruments', 'Home Appliances', 'Vehicles', 'Tools', 'Other'
];

export const WorkerForm: React.FC<WorkerFormProps> = ({ onClose, userLocation, onServiceAdded }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: serviceCategories[0],
    price: '',
    type: 'service', // 'service', 'sell', 'rent'
    image: null as File | null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to post a listing.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let imageUrl = '';

      // Upload image to Supabase storage if provided
      if (formData.image && user) {
        const fileName = `ad-${Date.now()}-${formData.image.name}`;
        const objectPath = `${user.id}/ads/${fileName}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(objectPath, formData.image);

        if (uploadError) {
          console.error('Image upload error:', uploadError);
          toast({
            title: "Image Upload Error",
            description: "Failed to upload image, but will continue without it.",
            variant: "destructive",
          });
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(objectPath);
          imageUrl = publicUrl;
        }
      }

      // Insert ad into database
      const { data, error } = await supabase
        .from('ads')
        .insert({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          price: parseFloat(formData.price),
          image_url: imageUrl,
          location_lat: userLocation.lat + (Math.random() - 0.5) * 0.02,
          location_lng: userLocation.lng + (Math.random() - 0.5) * 0.02,
          user_id: user.id,
          is_active: true,
          ad_type: formData.type // Add type field to distinguish services/products
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating ad:', error);
        toast({
          title: "Error",
          description: "Failed to post listing. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Your ${formData.type} has been posted successfully!`,
      });

      onServiceAdded(data);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to post listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
    }
  };

  const getCurrentCategories = () => {
    return formData.type === 'service' ? serviceCategories : productCategories;
  };

  const getFormTitle = () => {
    switch (formData.type) {
      case 'service': return 'Post a Service';
      case 'sell': return 'Sell a Product';
      case 'rent': return 'Rent a Product';
      default: return 'Create Listing';
    }
  };

  const getPricePlaceholder = () => {
    switch (formData.type) {
      case 'service': return '0.00';
      case 'sell': return '0.00';
      case 'rent': return '0.00 per day';
      default: return '0.00';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">{getFormTitle()}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Listing Type
            </label>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ 
                  ...formData, 
                  type: 'service',
                  category: serviceCategories[0]
                })}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  formData.type === 'service'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                disabled={loading}
              >
                Service
              </button>
              <button
                type="button"
                onClick={() => setFormData({ 
                  ...formData, 
                  type: 'sell',
                  category: productCategories[0]
                })}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  formData.type === 'sell'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                disabled={loading}
              >
                Sell
              </button>
              <button
                type="button"
                onClick={() => setFormData({ 
                  ...formData, 
                  type: 'rent',
                  category: productCategories[0]
                })}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  formData.type === 'rent'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                disabled={loading}
              >
                Rent
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.type === 'service' ? 'Service' : 'Product'} Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder={formData.type === 'service' ? 'e.g., Professional House Cleaning' : 'e.g., iPhone 13 Pro Max'}
              disabled={loading}
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder={formData.type === 'service' ? 'Describe your service in detail...' : 'Describe your product, condition, etc...'}
              disabled={loading}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={loading}
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
                Price (ETB) {formData.type === 'rent' && '/ Day'}
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder={getPricePlaceholder()}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.type === 'service' ? 'Service' : 'Product'} Image
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                disabled={loading || uploading}
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                {uploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-2"></div>
                ) : (
                  <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                )}
                <p className="text-gray-600">Click to upload an image</p>
                <p className="text-sm text-gray-400">PNG, JPG up to 10MB</p>
              </label>
              {formData.image && (
                <div className="mt-4">
                  <p className="text-sm text-green-600 mb-2">Selected: {formData.image.name}</p>
                  <img
                    src={URL.createObjectURL(formData.image)}
                    alt="Preview"
                    className="h-32 w-full object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
            <MapPin size={20} className="text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Location Information</h4>
              <p className="text-sm text-blue-700">
                Your listing will be visible to users within 10km of your current location.
              </p>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Posting...' : `Post ${formData.type === 'service' ? 'Service' : 'Product'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
