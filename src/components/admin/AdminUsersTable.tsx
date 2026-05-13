import React, { useState } from 'react';
import { useAdminUsers, useUpdateUser, useDeleteUser } from '@/hooks/useAdminData';
import { AdminAddForm } from './AdminAddForm';

const AdminUsersTable: React.FC = () => {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useAdminUsers(page);
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const totalPages = data ? Math.ceil(data.totalCount / 10) : 0;

  const handleStatusChange = (id: string, newType: string) => {
    updateUser.mutate({ id, updates: { user_type: newType } });
  };

  const handleVerify = (id: string) => {
    updateUser.mutate({ id, updates: { is_verified: true, verification_type: 'admin_verified' } });
  };

  const handleDisable = (id: string) => {
    updateUser.mutate({ id, updates: { user_type: 'disabled' } });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this user? This cannot be undone.')) {
      deleteUser.mutate(id);
    }
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
            <h2>Users Management</h2>
            <p>View and manage all registered users</p>
          </div>
          <AdminAddForm type="user" />
        </div>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <h3>All Users ({data?.totalCount ?? 0})</h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Verified</th>
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
                    No users found
                  </td>
                </tr>
              ) : (
                data?.data.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 500 }}>{user.full_name || '—'}</td>
                    <td>{user.phone_number || '—'}</td>
                    <td>
                      <select
                        className="admin-inline-select"
                        value={user.user_type || 'user'}
                        onChange={(e) => handleStatusChange(user.id, e.target.value)}
                      >
                        <option value="user">User</option>
                        <option value="worker">Worker</option>
                        <option value="admin">Admin</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </td>
                    <td>
                      <span className={`admin-badge ${user.is_verified ? 'green' : 'gray'}`}>
                        {user.is_verified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      <div className="admin-actions-cell">
                        {!user.is_verified && (
                          <button className="admin-action-btn success" onClick={() => handleVerify(user.id)}>
                            Verify
                          </button>
                        )}
                        {user.user_type !== 'disabled' && (
                          <button className="admin-action-btn yellow" onClick={() => handleDisable(user.id)}>
                            Disable
                          </button>
                        )}
                        <button className="admin-action-btn danger" onClick={() => handleDelete(user.id)}>
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
    </div>
  );
};

export default AdminUsersTable;
