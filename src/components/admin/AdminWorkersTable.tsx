import React, { useState } from 'react';
import { useAdminWorkers, useUpdateUser, useDeleteUser } from '@/hooks/useAdminData';
import { AlertTriangle, Loader2, Pencil } from 'lucide-react';
import { AdminAddForm } from './AdminAddForm';
import { AdminEditWorkerForm } from './AdminEditWorkerForm';

const AdminWorkersTable: React.FC = () => {
  const [page, setPage] = useState(0);
  const { data, isLoading, isError } = useAdminWorkers(page);
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const [editingWorker, setEditingWorker] = useState<any | null>(null);

  const totalPages = data ? Math.ceil(data.totalCount / 10) : 0;

  const handleVerify = (id: string) => {
    updateUser.mutate({ id, updates: { is_verified: true, verification_type: 'admin_verified' } });
  };

  const handleSuspend = (id: string) => {
    updateUser.mutate({ id, updates: { user_type: 'suspended_worker' } });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this worker? This action cannot be undone.')) {
      deleteUser.mutate(id);
    }
  };

  const handleVerificationChange = (id: string, verified: boolean) => {
    updateUser.mutate({
      id,
      updates: {
        is_verified: verified,
        verification_type: verified ? 'admin_verified' : null,
      },
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div>
      <div className="admin-content-header">
        <div className="flex justify-between items-center w-full">
          <div>
            <h2>Workers Management</h2>
            <p>Manage and verify service workers</p>
          </div>
          <AdminAddForm type="worker" />
        </div>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <h3>All Workers ({data?.totalCount ?? 0})</h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Verification</th>
                <th>Rating</th>
                <th>Category</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isError ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="bg-red-50 p-4 rounded-lg inline-block border border-red-100">
                      <AlertTriangle className="mx-auto text-red-500 mb-2" />
                      <p className="text-red-700 font-medium">Table missing or access denied</p>
                    </div>
                  </td>
                </tr>
              ) : isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}>
                        <div className="admin-skeleton" style={{ height: '1rem', width: '80%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No workers found
                  </td>
                </tr>
              ) : (
                data?.data.map((worker) => (
                  <tr key={worker.id}>
                    <td style={{ fontWeight: 500 }}>{worker.full_name || '—'}</td>
                    <td>{worker.phone_number || '—'}</td>
                    <td>
                      <select
                        className="admin-inline-select"
                        value={worker.is_verified ? 'verified' : 'unverified'}
                        onChange={(e) => handleVerificationChange(worker.id, e.target.value === 'verified')}
                      >
                        <option value="verified">Verified</option>
                        <option value="unverified">Unverified</option>
                      </select>
                    </td>
                    <td>
                      <span className={`admin-badge ${(worker.rating ?? 0) >= 4 ? 'green' : (worker.rating ?? 0) >= 2.5 ? 'yellow' : 'gray'}`}>
                        ★ {worker.rating?.toFixed(1) ?? 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className="admin-badge gray" style={{ textTransform: 'capitalize' }}>
                        {(worker as any).worker_locations?.[0]?.category?.replace('_', ' ') 
                          || worker.user_type?.replace('_', ' ') 
                          || '—'}
                      </span>
                    </td>
                    <td>{formatDate(worker.created_at)}</td>
                    <td>
                      <div className="admin-actions-cell">
                        <button className="admin-action-btn primary" onClick={() => setEditingWorker(worker)} title="Edit Worker">
                          <Pencil size={14} />
                        </button>
                        {!worker.is_verified && (
                          <button className="admin-action-btn success" onClick={() => handleVerify(worker.id)}>
                            Verify
                          </button>
                        )}
                        <button className="admin-action-btn yellow" onClick={() => handleSuspend(worker.id)}>
                          Suspend
                        </button>
                        <button className="admin-action-btn danger" onClick={() => handleDelete(worker.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="admin-pagination">
            <span className="admin-pagination-info">
              Page {page + 1} of {totalPages}
            </span>
            <div className="admin-pagination-buttons">
              <button
                className="admin-pagination-btn"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </button>
              <button
                className="admin-pagination-btn"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {editingWorker && (
        <AdminEditWorkerForm
          worker={editingWorker}
          isOpen={!!editingWorker}
          onClose={() => setEditingWorker(null)}
        />
      )}
    </div>
  );
};

export default AdminWorkersTable;
