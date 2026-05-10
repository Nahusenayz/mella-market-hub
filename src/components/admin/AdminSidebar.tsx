import React from 'react';
import {
  LayoutDashboard,
  Users,
  Wrench,
  Briefcase,
  CreditCard,
  BarChart3,
  LogOut,
  Menu,
  X,
  AlertTriangle,
} from 'lucide-react';

export type AdminSection =
  | 'dashboard'
  | 'users'
  | 'workers'
  | 'jobs'
  | 'payments'
  | 'emergencies'
  | 'reports';

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  isOpen: boolean;
  onToggle: () => void;
  profile: { full_name: string | null; email: string | null } | null;
  onLogout: () => void;
}

const navItems: { key: AdminSection; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'workers', label: 'Workers', icon: Wrench },
  { key: 'emergencies', label: 'Emergencies', icon: AlertTriangle },
  { key: 'jobs', label: 'Jobs', icon: Briefcase },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeSection,
  onSectionChange,
  isOpen,
  onToggle,
  profile,
  onLogout,
}) => {
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  return (
    <>
      {/* Mobile toggle */}
      <button className="admin-mobile-toggle" onClick={onToggle} aria-label="Toggle sidebar">
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      <div
        className={`admin-mobile-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onToggle}
      />

      {/* Sidebar */}
      <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <h1>Mella Admin</h1>
          <p>Management Dashboard</p>
        </div>

        <nav className="admin-sidebar-nav">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`admin-nav-item ${activeSection === key ? 'active' : ''}`}
              onClick={() => {
                onSectionChange(key);
                if (window.innerWidth < 768) onToggle();
              }}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-user-avatar">{initials}</div>
            <div className="admin-user-details">
              <p>{profile?.full_name || 'Admin'}</p>
              <p>{profile?.email || ''}</p>
            </div>
          </div>
          <button
            className="admin-nav-item"
            onClick={onLogout}
            style={{ marginTop: '0.75rem', color: '#f87171' }}
          >
            <LogOut />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
