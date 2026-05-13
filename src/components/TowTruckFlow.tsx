
import React, { useState, useEffect } from 'react';
import { X, MapPin, Phone, Navigation, Clock, CreditCard, Check, ChevronRight, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapView } from '@/components/MapView';
import { useWorkerLocations } from '@/hooks/useWorkerLocations';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Garage {
  id: string;
  name: string;
  phone: string;
  lat: number;
  lng: number;
  address: string;
}

const GARAGES: Garage[] = [
  { id: '1', name: 'MOENCO (Toyota Ethiopia)', phone: '+251116612233', lat: 8.995, lng: 38.788, address: 'Bole Road, Addis Ababa' },
  { id: '2', name: 'Nyala Motors', phone: '+251114341188', lat: 8.940, lng: 38.760, address: 'Kality, Addis Ababa' },
  { id: '3', name: 'Marathon Motors', phone: '+251116638444', lat: 9.002, lng: 38.802, address: 'Bole Road, Addis Ababa' },
  { id: '4', name: 'Ries Engineering', phone: '+251114421333', lat: 8.980, lng: 38.775, address: 'Debre Zeit Road, Addis Ababa' },
];

interface TowTruckFlowProps {
  userLocation: { lat: number; lng: number };
  onClose: () => void;
}

export const TowTruckFlow: React.FC<TowTruckFlowProps> = ({ userLocation, onClose }) => {
  const [step, setStep] = useState<'list' | 'details' | 'tracking'>('list');
  const [selectedGarage, setSelectedGarage] = useState<Garage | null>(null);
  const [distance, setDistance] = useState(0);
  const [price, setPrice] = useState(0);
  const [truckPos, setTruckPos] = useState<{ lat: number; lng: number } | null>(null);
  const { workers, loading: workersLoading } = useWorkerLocations('tow_truck');
  const { toast } = useToast();
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleSelectGarage = (garage: Garage) => {
    const d = calculateDistance(userLocation.lat, userLocation.lng, garage.lat, garage.lng);
    setSelectedGarage(garage);
    setDistance(d);
    setPrice(Math.round(d * 50));
    setStep('details');
  };

  const handleAccept = async () => {
    if (!selectedGarage) return;
    
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to request a tow truck.",
        variant: "destructive"
      });
      return;
    }

    try {
      const details = JSON.stringify({
        garage_name: selectedGarage.name,
        price: price,
        distance: distance.toFixed(2),
        address: selectedGarage.address
      });

      // Only set responder_id if it's a valid UUID (not one of our static string IDs)
      const isRealWorker = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedGarage.id);

      const { data, error } = await supabase
        .from('emergency_requests' as any)
        .insert({
          user_id: session.user.id,
          category: 'tow_truck',
          details: details,
          user_location_lat: userLocation.lat,
          user_location_lng: userLocation.lng,
          status: 'pending',
          estimated_price: price,
          responder_id: isRealWorker ? selectedGarage.id : null
        })
        .select()
        .single();

      if (error) throw error;

      setActiveRequestId(data.id);
      setRequestStatus('pending');
      setTruckPos({ lat: selectedGarage.lat, lng: selectedGarage.lng });
      setStep('tracking');
      
      toast({
        title: "Request Sent",
        description: isRealWorker 
          ? `Your request has been sent to ${selectedGarage.name}.` 
          : "Your request has been logged. We will contact you shortly.",
      });
    } catch (error: any) {
      console.error('Error creating request:', error);
      toast({
        title: "Request Failed",
        description: error.message || "Failed to send request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCancel = async () => {
    if (!activeRequestId) return;
    try {
      const { error } = await supabase
        .from('emergency_requests' as any)
        .update({ status: 'cancelled' })
        .eq('id', activeRequestId);
      
      if (error) throw error;
      
      toast({
        title: "Request Cancelled",
        description: "Your tow truck request has been cancelled.",
      });
      onClose();
    } catch (error: any) {
      console.error('Error cancelling request:', error);
    }
  };

  useEffect(() => {
    if (!activeRequestId) return;

    const channel = supabase
      .channel('tow-request-' + activeRequestId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'emergency_requests',
          filter: `id=eq.${activeRequestId}`
        },
        (payload) => {
          const newStatus = payload.new.status;
          setRequestStatus(newStatus);
          
          if (payload.new.responder_location_lat && payload.new.responder_location_lng) {
            setTruckPos({
              lat: payload.new.responder_location_lat,
              lng: payload.new.responder_location_lng
            });
          }

          if (newStatus === 'completed') {
            toast({
              title: "Job Completed",
              description: "The tow truck has arrived and the job is finished.",
            });
            setTimeout(onClose, 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRequestId, onClose]);

  useEffect(() => {
    if (step === 'tracking' && truckPos && selectedGarage && requestStatus !== 'accepted' && requestStatus !== 'en_route') {
      const interval = setInterval(() => {
        setTruckPos(prev => {
          if (!prev) return null;
          const latDiff = (userLocation.lat - prev.lat) * 0.05;
          const lngDiff = (userLocation.lng - prev.lng) * 0.05;
          
          if (Math.abs(latDiff) < 0.0001 && Math.abs(lngDiff) < 0.0001) {
            clearInterval(interval);
            return userLocation;
          }
          
          return {
            lat: prev.lat + latDiff,
            lng: prev.lng + lngDiff
          };
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, userLocation, requestStatus]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300">
      <div className="bg-white w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/20 animate-in slide-in-from-bottom duration-500">
        
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Tow Truck Service</h2>
              <p className="text-orange-100 text-xs">24/7 Roadside Assistance</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 'list' && (
            <div className="p-4 space-y-4">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Nearby Towing Garages</h3>
              {workersLoading ? (
                <div className="text-center py-12 text-gray-400">Loading nearby tow trucks...</div>
              ) : workers.length > 0 ? (
                workers.map(worker => {
                  const d = calculateDistance(userLocation.lat, userLocation.lng, worker.location_lat, worker.location_lng);
                  return (
                    <Card 
                      key={worker.id} 
                      className="p-4 cursor-pointer hover:border-orange-500 hover:shadow-md transition-all border-2 border-transparent group"
                      onClick={() => handleSelectGarage({
                        id: worker.id,
                        name: worker.profiles?.full_name || 'Tow Operator',
                        phone: worker.profiles?.phone_number || '',
                        lat: worker.location_lat,
                        lng: worker.location_lng,
                        address: 'Nearby Operator'
                      })}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex gap-3">
                          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 font-bold group-hover:bg-orange-600 group-hover:text-white transition-colors">
                            <Truck size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800">{worker.profiles?.full_name || 'Tow Operator'}</h4>
                            <p className="text-sm text-gray-500">Professional Towing</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-orange-600 font-medium">
                              <MapPin size={12} />
                              {d.toFixed(1)} km away • <Clock size={12} className="ml-1" /> ~{Math.round(d * 3)} min
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-orange-500 transition-colors" />
                      </div>
                    </Card>
                  );
                })
              ) : (
                GARAGES.map(garage => {
                  const d = calculateDistance(userLocation.lat, userLocation.lng, garage.lat, garage.lng);
                  return (
                    <Card 
                      key={garage.id} 
                      className="p-4 cursor-pointer hover:border-orange-500 hover:shadow-md transition-all border-2 border-transparent group"
                      onClick={() => handleSelectGarage(garage)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex gap-3">
                          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 font-bold group-hover:bg-orange-600 group-hover:text-white transition-colors">
                            <Truck size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800">{garage.name}</h4>
                            <p className="text-sm text-gray-500">{garage.address}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-orange-600 font-medium">
                              <MapPin size={12} />
                              {d.toFixed(1)} km away • <Clock size={12} className="ml-1" /> ~{Math.round(d * 3)} min
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-orange-500 transition-colors" />
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {step === 'details' && selectedGarage && (
            <div className="flex flex-col h-full">
              <div className="h-48 relative overflow-hidden bg-gray-100">
                <MapView 
                  services={[{
                    id: selectedGarage.id,
                    location: { lat: selectedGarage.lat, lng: selectedGarage.lng },
                    title: selectedGarage.name,
                    category: 'Tow Truck',
                    image: '',
                    price: 0,
                    provider: '',
                    rating: 5,
                    distance: distance,
                    user_id: ''
                  }]}
                  userLocation={userLocation}
                  distanceFilter={50}
                />
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">{selectedGarage.name}</h3>
                    <p className="text-gray-500">{selectedGarage.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-orange-600">{price} ETB</p>
                    <p className="text-xs text-gray-400 font-medium">50 Birr / KM</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                    <p className="text-xs text-orange-600 font-bold uppercase tracking-wider mb-1">Distance</p>
                    <p className="text-lg font-bold text-gray-800">{distance.toFixed(1)} KM</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Estimated Arrival</p>
                    <p className="text-lg font-bold text-gray-800">{Math.round(distance * 3)} Min</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <Button 
                    className="w-full h-14 text-lg font-bold bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-200"
                    onClick={handleAccept}
                  >
                    Confirm Tow Truck
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className="h-12 border-2"
                      onClick={() => setStep('list')}
                    >
                      Decline
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-12 border-2 border-green-200 text-green-600 hover:bg-green-50"
                      onClick={() => window.open(`tel:${selectedGarage.phone}`)}
                    >
                      <Phone size={18} className="mr-2" /> Call
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'tracking' && selectedGarage && (
            <div className="flex flex-col h-full">
              <div className="flex-1 relative bg-gray-100">
                <MapView 
                  services={[{
                    id: 'truck',
                    location: truckPos || { lat: selectedGarage.lat, lng: selectedGarage.lng },
                    title: 'Your Tow Truck',
                    category: 'Tow Truck',
                    image: '',
                    price: 0,
                    provider: 'En Route',
                    rating: 5,
                    distance: 0,
                    user_id: ''
                  }]}
                  userLocation={userLocation}
                  distanceFilter={50}
                />
                
                {/* Overlay Status */}
                <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur rounded-2xl p-4 shadow-xl border border-white/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white animate-pulse">
                      <Truck size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Truck is coming!</p>
                      <p className="text-xs text-gray-500">Distance: {truckPos ? calculateDistance(truckPos.lat, truckPos.lng, userLocation.lat, userLocation.lng).toFixed(2) : '...'} km</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => window.open(`tel:${selectedGarage.phone}`)}>
                    <Phone size={16} />
                  </Button>
                </div>
              </div>

              <div className="p-6 bg-white border-t border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Driver" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800">Abebe Balcha</h4>
                    <p className="text-sm text-gray-500">Toyota Hilux • AA 2-34567</p>
                  </div>
                  <div className="flex items-center gap-1 bg-orange-100 px-2 py-1 rounded-lg">
                    <span className="text-orange-600 font-bold">4.9</span>
                    <span className="text-orange-400">★</span>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full text-red-600 border-red-100 hover:bg-red-50" onClick={handleCancel}>
                  Cancel Request
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
