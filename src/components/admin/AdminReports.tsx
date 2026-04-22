import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAdminReports } from '@/hooks/useAdminData';

const AdminReports: React.FC = () => {
  const { data, isLoading } = useAdminReports();

  return (
    <div>
      <div className="admin-content-header">
        <h2>Reports</h2>
        <p>Platform analytics and performance metrics</p>
      </div>

      <div className="admin-charts-grid">
        {/* Jobs per Day */}
        <div className="admin-chart-card">
          <h3>Jobs per Day (Last 7 Days)</h3>
          {isLoading ? (
            <div className="admin-skeleton" style={{ height: '250px', width: '100%' }} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data?.jobsPerDay ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.8125rem',
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Jobs"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Users per Week */}
        <div className="admin-chart-card">
          <h3>New Users per Week (Last 8 Weeks)</h3>
          {isLoading ? (
            <div className="admin-skeleton" style={{ height: '250px', width: '100%' }} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data?.usersPerWeek ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.8125rem',
                  }}
                />
                <Bar
                  dataKey="count"
                  name="New Users"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
