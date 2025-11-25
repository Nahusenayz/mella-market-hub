
import React, { useEffect, useState } from 'react';
import { useEmergencyRequests } from '@/hooks/useEmergencyRequests';
import { MapPin, Check, X, Navigation, Flag } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';

const ResponderDashboard: React.FC = () => {
  const { requests, loading, acceptRequest, declineRequest, updateStatus } = useEmergencyRequests();
  const { toast } = useToast();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [watching, setWatching] = useState<number | null>(null);

  useEffect(() => {
    if (watching !== null) return;
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 60000 }
    );
    setWatching(id);
    return () => {
      if (id !== null) navigator.geolocation.clearWatch(id);
    };
  }, [watching]);

  const startEnRoute = async (id: string) => {
    if (!location) {
      toast({ title: 'Location required', description: 'Enable location to start route', variant: 'destructive' });
      return;
    }
    await updateStatus(id, 'en_route', location);
  };

  const complete = async (id: string) => {
    await updateStatus(id, 'completed');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-blue-50 to-indigo-50 pb-4">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Responder Dashboard</h1>
          <p className="text-gray-600">View and act on emergency requests</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 font-semibold">Incoming and Active</div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No requests</div>
          ) : (
            <div className="divide-y">
              {requests.map((r) => (
                <div key={r.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Flag size={16} className="text-red-500" />
                        <span className="font-semibold capitalize">{r.category || 'Emergency'}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                          r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          r.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                          r.status === 'en_route' ? 'bg-purple-100 text-purple-800' :
                          r.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>{r.status.replace('_', ' ').toUpperCase()}</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">{r.details || 'No details provided'}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        <MapPin size={14} />
                        {r.user_location_lat && r.user_location_lng ? (
                          <a
                            className="text-blue-600 underline"
                            href={`https://maps.google.com/?q=${r.user_location_lat},${r.user_location_lng}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Navigate to caller
                          </a>
                        ) : (
                          <span>Caller location unavailable</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4 min-w-40">
                      {r.status === 'pending' && (
                        <>
                          <button onClick={() => acceptRequest(r.id)} className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 flex items-center gap-1">
                            <Check size={14} /> Accept
                          </button>
                          <button onClick={() => declineRequest(r.id)} className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 flex items-center gap-1">
                            <X size={14} /> Decline
                          </button>
                        </>
                      )}
                      {r.status === 'accepted' && (
                        <button onClick={() => startEnRoute(r.id)} className="bg-purple-500 text-white px-3 py-1 rounded-lg hover:bg-purple-600 flex items-center gap-1">
                          <Navigation size={14} /> Start En Route
                        </button>
                      )}
                      {r.status === 'en_route' && (
                        <button onClick={() => complete(r.id)} className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700">
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResponderDashboard;
