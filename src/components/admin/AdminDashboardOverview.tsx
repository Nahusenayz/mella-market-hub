import React from 'react';
import { Users, Wrench, Briefcase, Clock } from 'lucide-react';
import { useAdminStats } from '@/hooks/useAdminData';

const AdminDashboardOverview: React.FC = () => {
  const { data: stats, isLoading } = useAdminStats();

  const cards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'blue' as const,
    },
    {
      label: 'Active Workers',
      value: stats?.activeWorkers ?? 0,
      icon: Wrench,
      color: 'green' as const,
    },
    {
      label: 'Total Jobs',
      value: stats?.totalJobs ?? 0,
      icon: Briefcase,
      color: 'purple' as const,
    },
    {
      label: 'Pending Jobs',
      value: stats?.pendingJobs ?? 0,
      icon: Clock,
      color: 'amber' as const,
    },
  ];

  return (
    <div>
      <div className="admin-content-header">
        <h2>Dashboard Overview</h2>
        <p>Real-time overview of your platform metrics</p>
      </div>

      <div className="admin-stats-grid">
        {cards.map((card) => (
          <div key={card.label} className="admin-stat-card">
            <div className="admin-stat-card-header">
              <span>{card.label}</span>
              <div className={`admin-stat-icon ${card.color}`}>
                <card.icon size={18} />
              </div>
            </div>
            {isLoading ? (
              <div className="admin-skeleton" style={{ height: '2.25rem', width: '5rem' }} />
            ) : (
              <div className="admin-stat-value">
                {card.value.toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboardOverview;
