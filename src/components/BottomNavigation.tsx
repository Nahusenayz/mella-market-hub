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
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg z-[100] pb-safe md:hidden">
      <div className="flex justify-around items-center py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          if (item.isLink) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-2 px-3 min-h-[56px] transition-colors ${active
                    ? 'text-orange-500'
                    : 'text-gray-500 hover:text-orange-400'
                  }`}
              >
                <Icon
                  size={24}
                  className={`mb-1 ${active ? 'fill-current' : ''}`}
                />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          } else {
            return (
              <button
                key={item.path}
                onClick={() => handleItemClick(item)}
                className={`flex flex-col items-center justify-center py-2 px-3 min-h-[56px] transition-colors ${active
                    ? 'text-orange-500'
                    : 'text-gray-500 hover:text-orange-400'
                  }`}
              >
                <Icon
                  size={24}
                  className={`mb-1 ${active ? 'fill-current' : ''}`}
                />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          }
        })}
      </div>
    </nav>
  );
};