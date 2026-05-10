import React, { useState } from 'react';
import { useAdminJobs, useUpdateJob } from '@/hooks/useAdminData';

const statusFilters = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const AdminJobsTable: React.FC = () => {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const { data, isLoading } = useAdminJobs(page, statusFilter);
  const updateJob = useUpdateJob();

  const totalPages = data ? Math.ceil(data.totalCount / 10) : 0;

  const handleStatusChange = (id: string, newStatus: string) => {
    updateJob.mutate({ id, updates: { status: newStatus } });
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    updateJob.mutate({ id, updates: { is_active: !currentStatus } });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div>
      <div className="admin-content-header">
        <h2>User Posts (Jobs)</h2>
        <p>Monitor all service listings and marketplace posts</p>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <h3>Total Posts ({data?.totalCount ?? 0})</h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
                <th>Created</th>
                <th>Visibility</th>
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
                    No posts found. Start by adding a test service in the Supabase SQL editor.
                  </td>
                </tr>
              ) : (
                data?.data.map((post) => (
                  <tr key={post.id}>
                    <td style={{ fontWeight: 600 }}>{post.title}</td>
                    <td>
                      <span className="admin-badge blue">{post.category}</span>
                    </td>
                    <td>{post.price != null ? `$${post.price.toFixed(2)}` : '—'}</td>
                    <td>
                      <span className={`admin-badge ${post.status === 'active' || post.is_active ? 'green' : 'yellow'}`}>
                        {post.status || (post.is_active ? 'Active' : 'Draft')}
                      </span>
                    </td>
                    <td>{formatDate(post.created_at)}</td>
                    <td>
                      <button 
                        className={`admin-action-btn ${post.is_active ? 'danger' : 'success'}`}
                        onClick={() => handleToggleActive(post.id, post.is_active)}
                      >
                        {post.is_active ? 'Deactivate' : 'Activate'}
                      </button>
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

export default AdminJobsTable;
