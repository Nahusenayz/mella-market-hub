import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, AlertTriangle, Plus, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const navItems = [
    {
      icon: Home,
      label: t('home'),
      path: '/',
      isLink: true,
    },
    {
      icon: AlertTriangle,
      label: t('emergency'),
      path: '/emergency',
      isLink: true,
    },
    {
      icon: Plus,
      label: t('add'),
      path: '/add-post',
      isLink: false,
      action: 'add-post',
    },
    {
      icon: User,
      label: t('profile'),
      path: '/profile',
      isLink: true,
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleAddPost = () => {
    if (!user) {
      toast({
        title: t('authRequired'),
        description: t('signInToShare'),
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }
    navigate('/', { state: { openAdForm: true } });
  };

  const handleItemClick = (item: any) => {
    if (item.action === 'add-post') {
      handleAddPost();
    }
  };

  return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-[100] pb-safe md:hidden border-t border-gray-100 dark:border-slate-700">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            const content = (
              <div className={`flex flex-col items-center justify-center gap-1 transition-all relative ${active ? 'text-orange-600' : 'text-slate-500 dark:text-slate-400 hover:text-orange-400'}`}>
                <div className={`p-1.5 rounded-xl ${active ? 'bg-orange-50 dark:bg-orange-900/30' : ''}`}>
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight">
                  {item.label}
                </span>
              </div>
            );

            return (
              <div key={item.path} className="flex-1">
                {item.isLink ? (
                  <Link to={item.path} className="w-full h-full block py-2">
                    {content}
                  </Link>
                ) : (
                  <button onClick={() => handleItemClick(item)} className="w-full h-full py-2">
                    {content}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </nav>
  );
};