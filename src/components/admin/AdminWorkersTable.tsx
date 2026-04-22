import React, { useState } from 'react';
import { useAdminWorkers, useUpdateUser } from '@/hooks/useAdminData';

const AdminWorkersTable: React.FC = () => {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useAdminWorkers(page);
  const updateUser = useUpdateUser();

  const totalPages = data ? Math.ceil(data.totalCount / 10) : 0;

  const handleVerify = (id: string) => {
    updateUser.mutate({ id, updates: { is_verified: true, verification_type: 'admin_verified' } });
  };

  const handleSuspend = (id: string) => {
    updateUser.mutate({ id, updates: { user_type: 'suspended_worker' } });
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
        <h2>Workers Management</h2>
        <p>Manage and verify service workers</p>
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
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
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
                    <td>{formatDate(worker.created_at)}</td>
                    <td>
                      <div className="admin-actions-cell">
                        {!worker.is_verified && (
                          <button className="admin-action-btn success" onClick={() => handleVerify(worker.id)}>
                            Verify
                          </button>
                        )}
                        <button className="admin-action-btn danger" onClick={() => handleSuspend(worker.id)}>
                          Suspend
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
    </div>
  );
};

export default AdminWorkersTable;
