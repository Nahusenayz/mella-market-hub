import React, { useState } from 'react';
import { useAdminPayments } from '@/hooks/useAdminData';

const AdminPaymentsTable: React.FC = () => {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useAdminPayments(page);

  const totalPages = data ? Math.ceil(data.totalCount / 10) : 0;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string | null): string => {
    switch (status) {
      case 'completed': case 'success': return 'green';
      case 'pending': return 'yellow';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div>
      <div className="admin-content-header">
        <h2>Payments</h2>
        <p>Track all payment transactions</p>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <h3>Transactions ({data?.totalCount ?? 0})</h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
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
                    No transactions found
                  </td>
                </tr>
              ) : (
                data?.data.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {tx.transaction_id || tx.id.slice(0, 8) + '…'}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {tx.amount.toFixed(2)}
                    </td>
                    <td>{tx.currency?.toUpperCase() || 'ETB'}</td>
                    <td>
                      <span className="admin-badge blue">{tx.payment_method}</span>
                    </td>
                    <td>
                      <span className={`admin-badge ${getStatusColor(tx.status)}`}>
                        {tx.status || 'unknown'}
                      </span>
                    </td>
                    <td>{formatDate(tx.created_at)}</td>
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

export default AdminPaymentsTable;
