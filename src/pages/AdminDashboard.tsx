import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminSidebar, { type AdminSection } from '@/components/admin/AdminSidebar';
import AdminDashboardOverview from '@/components/admin/AdminDashboardOverview';
import AdminUsersTable from '@/components/admin/AdminUsersTable';
import AdminWorkersTable from '@/components/admin/AdminWorkersTable';
import AdminJobsTable from '@/components/admin/AdminJobsTable';
import AdminPaymentsTable from '@/components/admin/AdminPaymentsTable';
import AdminReports from '@/components/admin/AdminReports';
import { ShieldX, Loader2 } from 'lucide-react';
import '@/styles/admin.css';

const AdminDashboard: React.FC = () => {
  const { signOut } = useAuth();
  const { isAdmin, isLoading, profile } = useAdminAuth();
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className="admin-access-denied">
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
        <p>Verifying admin access…</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Access denied
  if (!isAdmin) {
    return (
      <div className="admin-access-denied">
        <ShieldX size={48} style={{ color: '#ef4444' }} />
        <h2>Access Denied</h2>
        <p>You don't have permission to access the admin dashboard.</p>
        <Link to="/">← Back to Home</Link>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AdminDashboardOverview />;
      case 'users':
        return <AdminUsersTable />;
      case 'workers':
        return <AdminWorkersTable />;
      case 'jobs':
        return <AdminJobsTable />;
      case 'payments':
        return <AdminPaymentsTable />;
      case 'reports':
        return <AdminReports />;
      default:
        return <AdminDashboardOverview />;
    }
  };

  return (
    <div className="admin-dashboard">
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        profile={profile ? { full_name: profile.full_name, email: profile.email } : null}
        onLogout={signOut}
      />
      <main className="admin-content">
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminDashboard;
