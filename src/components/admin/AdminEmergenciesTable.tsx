
import React, { useState } from 'react';
import { useAdminEmergencies, useUpdateEmergency } from '@/hooks/useAdminData';
import { AlertTriangle, MapPin, Phone, User, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const AdminEmergenciesTable: React.FC = () => {
  const [page, setPage] = useState(0);
  const { data, isLoading, isError } = useAdminEmergencies(page);
  const updateEmergency = useUpdateEmergency();

  const handleStatusChange = (id: string, newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'cancelled') {
      updates.responder_id = null;
    }
    updateEmergency.mutate({ id, updates });
  };

  const handleCancel = (id: string) => {
    if (window.confirm('Are you sure you want to cancel this emergency request?')) {
      handleStatusChange(id, 'cancelled');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-red-100 text-red-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'en_route': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2" /> Loading emergencies...</div>;
  }

  if (isError) {
    return (
      <div className="p-8 text-center bg-red-50 border border-red-200 rounded-xl m-4">
        <AlertTriangle className="mx-auto text-red-500 mb-2" size={40} />
        <h3 className="text-red-800 font-bold">Emergency Table Not Found</h3>
        <p className="text-red-600 text-sm mt-1">Please ensure the 'emergency_requests' table exists in your Supabase project.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-content-header">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-red-600" />
          <h2>Emergency Requests</h2>
        </div>
        <p>Monitor and manage real-time emergency signals</p>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Time / Category</th>
              <th>User (Caller)</th>
              <th>Location</th>
              <th>Responder</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((req) => (
              <tr key={req.id}>
                <td>
                  <div className="flex flex-col">
                    <span className="font-bold text-red-600 uppercase text-xs">{req.category}</span>
                    <span className="text-xs text-gray-500">{format(new Date(req.created_at), 'MMM d, HH:mm')}</span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <User size={14} className="text-gray-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{req.user_profile?.full_name || 'Anonymous'}</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone size={10} /> {req.user_profile?.phone_number || 'No phone'}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <a 
                    href={`https://maps.google.com/?q=${req.user_location_lat},${req.user_location_lng}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <MapPin size={12} /> Map View
                  </a>
                </td>
                 <td>
                  {req.responder_id ? (
                    <div className="flex flex-col">
                      <span className="text-sm">{req.worker_profile?.full_name || 'Responder'}</span>
                      <span className="text-xs text-gray-500">{req.worker_profile?.phone_number}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No responder yet</span>
                  )}
                </td>
                <td>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(req.status)}`}>
                    {req.status.toUpperCase()}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {req.status === 'pending' && (
                      <button 
                        onClick={() => handleCancel(req.id)}
                        className="p-1 hover:bg-red-50 text-red-600 rounded"
                        title="Cancel Request"
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                    {req.status !== 'completed' && (
                      <button 
                        onClick={() => handleStatusChange(req.id, 'completed')}
                        className="p-1 hover:bg-green-50 text-green-600 rounded"
                        title="Mark Completed"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="admin-pagination">
        <button 
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="admin-btn secondary sm"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">Page {page + 1}</span>
        <button 
          onClick={() => setPage(p => p + 1)}
          disabled={!data || data.data.length < 10}
          className="admin-btn secondary sm"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AdminEmergenciesTable;
