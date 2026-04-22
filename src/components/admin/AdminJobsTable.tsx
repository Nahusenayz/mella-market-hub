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

  const handleCancel = (id: string) => {
    updateJob.mutate({ id, updates: { status: 'cancelled' } });
  };

  const handleForceAssign = (id: string) => {
    // In a real scenario, you'd open a modal to pick a worker
    // For now, just mark as active
    updateJob.mutate({ id, updates: { status: 'active' } });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusBadgeColor = (status: string | null): string => {
    switch (status) {
      case 'completed': return 'green';
      case 'active': case 'in_progress': return 'blue';
      case 'pending': return 'yellow';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div>
      <div className="admin-content-header">
        <h2>Jobs Management</h2>
        <p>Monitor and manage all service bookings</p>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <h3>Jobs ({data?.totalCount ?? 0})</h3>
          <div className="admin-filter-tabs">
            {statusFilters.map((f) => (
              <button
                key={f.key}
                className={`admin-filter-tab ${statusFilter === f.key ? 'active' : ''}`}
                onClick={() => { setStatusFilter(f.key); setPage(0); }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Amount</th>
                <th>Created</th>
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
                    No jobs found
                  </td>
                </tr>
              ) : (
                data?.data.map((job) => (
                  <tr key={job.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {job.id.slice(0, 8)}…
                    </td>
                    <td>
                      <select
                        className="admin-inline-select"
                        value={job.status || 'pending'}
                        onChange={(e) => handleStatusChange(job.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td>
                      <span className={`admin-badge ${job.payment_status === 'paid' ? 'green' : 'yellow'}`}>
                        {job.payment_status || 'unpaid'}
                      </span>
                    </td>
                    <td>{job.total_amount != null ? `$${job.total_amount.toFixed(2)}` : '—'}</td>
                    <td>{formatDate(job.created_at)}</td>
                    <td>
                      <div className="admin-actions-cell">
                        {job.status === 'pending' && (
                          <button className="admin-action-btn success" onClick={() => handleForceAssign(job.id)}>
                            Force Assign
                          </button>
                        )}
                        {job.status !== 'cancelled' && job.status !== 'completed' && (
                          <button className="admin-action-btn danger" onClick={() => handleCancel(job.id)}>
                            Cancel
                          </button>
                        )}
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

export default AdminJobsTable;
