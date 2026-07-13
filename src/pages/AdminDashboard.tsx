import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import AdminSidebar, { type AdminSection } from '@/components/admin/AdminSidebar';
import AdminDashboardOverview from '@/components/admin/AdminDashboardOverview';
import AdminUsersTable from '@/components/admin/AdminUsersTable';
import AdminWorkersTable from '@/components/admin/AdminWorkersTable';
import AdminJobsTable from '@/components/admin/AdminJobsTable';
import AdminPaymentsTable from '@/components/admin/AdminPaymentsTable';
import AdminReports from '@/components/admin/AdminReports';
import AdminEmergenciesTable from '@/components/admin/AdminEmergenciesTable';
import { useAnomalyDetection } from '@/hooks/useAnomalyDetection';
import { ShieldX, Loader2, ShieldCheck, Lock, User as UserIcon } from 'lucide-react';
import { playAlarm, requestBrowserNotification, initAudioContext } from '@/utils/notifications';
import '@/styles/admin.css';

const AdminDashboard: React.FC = () => {
  const { signOut } = useAuth();
  const { isAdmin, isLoading, profile } = useAdminAuth();
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [newEmergencyCount, setNewEmergencyCount] = useState(0);
  const queryClient = useQueryClient();

  // Pre-create AudioContext on first user click (required for autoplay policy)
  useEffect(() => {
    const handler = () => { initAudioContext(); document.removeEventListener('click', handler); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel('admin-emergency-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emergency_requests' }, (payload) => {
        const newReq = payload.new as any;
        if (newReq.status === 'pending') {
          playAlarm();
          setNewEmergencyCount(c => c + 1);
          requestBrowserNotification('New Emergency!', `${newReq.category || 'Emergency'} — ${newReq.details?.slice(0, 60) || ''}`);
          queryClient.invalidateQueries({ queryKey: ['admin', 'emergencies'] });
          queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'emergency_requests' }, (payload) => {
        const row = payload.new as any;
        const old = payload.old as any;
        if (row.status !== old?.status && (row.status === 'accepted' || row.status === 'en_route' || row.status === 'completed')) {
          playAlarm();
          queryClient.invalidateQueries({ queryKey: ['admin', 'emergencies'] });
          queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, queryClient]);

  const anomalies = useAnomalyDetection();

  const clearNewEmergencies = () => setNewEmergencyCount(0);

  // Login states
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    
    // Map 'admin' to a full email if needed for Supabase Auth
    const email = loginUser.includes('@') ? loginUser : `${loginUser}@mella.com`;
    
    const { error } = await supabase.auth.signInWithPassword({ 
      email: email, 
      password: loginPass 
    });

    if (error) {
      setLoginError('Invalid credentials. Please check your username and password.');
      setLoginLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="admin-access-denied">
        <Loader2 size={40} className="animate-spin text-orange-500" />
        <p className="mt-4">Verifying admin access…</p>
      </div>
    );
  }

  // Access denied / Login form
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="text-orange-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Mella Admin Portal</h2>
            <p className="text-gray-500 mt-1">Please sign in to manage the platform</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {loginError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-700">
                {loginError}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <div className="relative">
                <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="admin"
                  value={loginUser}
                  onChange={e => setLoginUser(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="••••••••"
                  value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50"
              disabled={loginLoading}
            >
              {loginLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Don't have an admin account?{' '}
            <a href="/admin-register" className="text-orange-500 hover:text-orange-600 font-medium">
              Register here
            </a>
          </p>

          <p className="mt-4 text-center text-xs text-gray-400 uppercase tracking-widest">
            Protected by Mella Security
          </p>
        </div>
      </div>
    );
  }

  const handleSectionChange = (section: AdminSection) => {
    setActiveSection(section);
    if (section === 'emergencies') clearNewEmergencies();
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AdminDashboardOverview />;
      case 'users':
        return <AdminUsersTable />;
      case 'workers':
        return <AdminWorkersTable />;
      case 'emergencies':
        return <AdminEmergenciesTable />;
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
        onSectionChange={handleSectionChange}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        profile={profile ? { full_name: profile.full_name, email: profile.email } : null}
        onLogout={signOut}
        newEmergencyCount={newEmergencyCount}
      />
      <main className="admin-content">
        {anomalies.length > 0 && (
          <div className="px-6 pt-4 space-y-2">
            {anomalies.map((a, i) => (
              <div key={i} className={`px-4 py-3 rounded-lg text-sm font-medium ${
                a.severity === 'danger' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
              }`}>
                {a.message}
              </div>
            ))}
          </div>
        )}
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminDashboard;
