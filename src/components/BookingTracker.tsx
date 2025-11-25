
import React, { useState } from 'react';
import { MapPin, Clock, Phone, Shield, Navigation, CheckCircle } from 'lucide-react';
import { useBookingTracking } from '@/hooks/useBookingTracking';
import { useAuth } from '@/contexts/AuthContext';

export const BookingTracker: React.FC = () => {
  const { user } = useAuth();
  const { activeBookings, loading, updateBookingStatus, updateETA, shareEmergencyContact } = useBookingTracking();
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'en_route': return 'bg-purple-100 text-purple-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} />;
      case 'accepted': return <CheckCircle size={16} />;
      case 'en_route': return <Navigation size={16} />;
      case 'in_progress': return <MapPin size={16} />;
      case 'completed': return <CheckCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const isWorker = (booking: any) => booking.worker_id === user?.id;

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="border p-4 rounded-lg">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeBookings.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm text-center">
        <MapPin size={48} className="mx-auto text-gray-300 mb-3" />
        <h3 className="text-lg font-medium text-gray-800 mb-2">No Active Bookings</h3>
        <p className="text-gray-500">Your active service bookings will appear here</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Active Bookings</h2>
      </div>

      <div className="divide-y divide-gray-200">
        {activeBookings.map((booking) => (
          <div key={booking.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-1">{booking.ad.title}</h3>
                <p className="text-gray-600 text-sm mb-2">
                  {isWorker(booking) ? `Customer: ${booking.customer.full_name}` : `Provider: ${booking.worker.full_name}`}
                </p>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                  {getStatusIcon(booking.status)}
                  {booking.status.replace('_', ' ').toUpperCase()}
                </div>
              </div>
              
              <div className="text-right">
                <p className="font-semibold text-gray-800">ETB {booking.ad.price.toLocaleString()}</p>
                {booking.eta_minutes && (
                  <p className="text-sm text-purple-600 font-medium">
                    ETA: {booking.eta_minutes} minutes
                  </p>
                )}
              </div>
            </div>

            {/* Live Location Tracking */}
            {booking.provider_location_lat && booking.provider_location_lng && (
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="text-blue-600" size={16} />
                  <span className="text-sm font-medium text-blue-800">Live Location</span>
                </div>
                <p className="text-sm text-blue-700">
                  Provider location: {booking.provider_location_lat.toFixed(4)}, {booking.provider_location_lng.toFixed(4)}
                </p>
              </div>
            )}

            {/* Emergency Contact */}
            {booking.emergency_contact && (
              <div className="bg-red-50 p-4 rounded-lg mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="text-red-600" size={16} />
                  <span className="text-sm font-medium text-red-800">Emergency Contact</span>
                </div>
                <p className="text-sm text-red-700">
                  {booking.emergency_contact.name}: {booking.emergency_contact.phone}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              {isWorker(booking) && (
                <>
                  {booking.status === 'pending' && (
                    <button
                      onClick={() => updateBookingStatus(booking.id, 'accepted')}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
                    >
                      Accept Booking
                    </button>
                  )}
                  
                  {booking.status === 'accepted' && (
                    <button
                      onClick={() => {
                        navigator.geolocation.getCurrentPosition((position) => {
                          updateBookingStatus(booking.id, 'en_route', {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                          });
                        });
                      }}
                      className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors text-sm"
                    >
                      I'm On My Way
                    </button>
                  )}
                  
                  {booking.status === 'en_route' && (
                    <button
                      onClick={() => updateBookingStatus(booking.id, 'in_progress')}
                      className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm"
                    >
                      Start Service
                    </button>
                  )}
                  
                  {booking.status === 'in_progress' && (
                    <button
                      onClick={() => updateBookingStatus(booking.id, 'completed')}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
                    >
                      Complete Service
                    </button>
                  )}
                </>
              )}

              {/* Contact Button */}
              <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center gap-2">
                <Phone size={16} />
                Contact {isWorker(booking) ? 'Customer' : 'Provider'}
              </button>

              {/* Emergency Contact Button for Customers */}
              {!isWorker(booking) && !booking.emergency_contact && (
                <button
                  onClick={() => {
                    const name = prompt('Emergency Contact Name:');
                    const phone = prompt('Emergency Contact Phone:');
                    if (name && phone) {
                      shareEmergencyContact(booking.id, { name, phone });
                    }
                  }}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center gap-2"
                >
                  <Shield size={16} />
                  Share Emergency Contact
                </button>
              )}
            </div>

            {/* Status History */}
            {booking.status_history.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Status History</h4>
                <div className="space-y-1">
                  {booking.status_history.map((history: any, index: number) => (
                    <div key={index} className="text-xs text-gray-500 flex justify-between">
                      <span>{history.status.replace('_', ' ')}</span>
                      <span>{new Date(history.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
