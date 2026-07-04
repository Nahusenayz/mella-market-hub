
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationSystem } from './NotificationSystem';
import { UserSearch } from './UserSearch';
import { UserProfileModal } from './UserProfile';
import { User, LogOut, MessageSquare, Home, Plus, Globe, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import logo from '@/logo.png';
import { Translated } from './Translated';

import { Button } from '@/components/ui/button';

interface NavbarProps {
  onPostAd?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onPostAd }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [selectedUserProfile, setSelectedUserProfile] = useState<string | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleUserSearchClick = (userId: string) => {
    setSelectedUserProfile(userId);
  };

  const handleCloseUserProfile = () => {
    setSelectedUserProfile(null);
  };

  const handlePostAd = () => {
    if (onPostAd) {
      onPostAd();
    } else {
      navigate('/');
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'am' : 'en');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="glass-navbar border-none shadow-none">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => navigate('/')}
            >
              <div className="premium-gradient-orange p-2 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <img src={logo} alt="Mella" className="w-8 h-8 object-contain" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">Mella</h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Market Hub</p>
              </div>
            </div>

            {/* Navigation Links - Horizontal on desktop */}
            <div className="hidden md:flex items-center space-x-1 sm:space-x-4 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
              <button 
                onClick={() => navigate('/')} 
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-xs md:text-sm font-bold whitespace-nowrap ${isActive('/') ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-600 hover:text-orange-500 hover:bg-white/50'}`}
              >
                <Home size={16} />
                <span className="hidden sm:inline">{t('home')}</span>
              </button>
              <button 
                onClick={() => navigate('/emergency')} 
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-xs md:text-sm font-bold whitespace-nowrap ${isActive('/emergency') ? 'bg-red-50 text-red-600 shadow-sm' : 'text-red-500 hover:text-red-600 hover:bg-white/50'}`}
              >
                <AlertTriangle size={16} />
                <span className="hidden sm:inline">{t('emergency')}</span>
              </button>
            </div>
            

            {/* Right Side */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Language Switcher */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
                className="flex items-center gap-1 text-gray-600 hover:text-orange-600 flex-shrink-0 px-2"
              >
                <Globe size={18} />
                <span className="text-xs font-bold uppercase">{language === 'en' ? 'አማ' : 'EN'}</span>
              </Button>
              {user ? (
                <>
                  {/* Notifications */}
                  <NotificationSystem />

                  {/* Messages */}
                  <button
                    onClick={() => navigate('/messages')}
                    className={`p-2 rounded-full transition-colors ${isActive('/messages')
                      ? 'bg-orange-100 text-orange-600'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                      }`}
                  >
                    <MessageSquare size={20} />
                  </button>

                  {/* Post Ad */}
                  <button
                    onClick={handlePostAd}
                    className="premium-gradient-orange text-white px-5 py-2.5 rounded-2xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-orange-200 font-bold text-sm"
                  >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Share</span>
                  </button>

                  {/* Profile Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    >
                      {user.user_metadata?.avatar_url ? (
                        <img
                          src={user.user_metadata.avatar_url}
                          alt="Profile"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <User size={16} className="text-orange-600" />
                        </div>
                      )}
                      <span className="hidden md:block text-sm font-medium text-gray-700">
                        <Translated text={user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'} />
                      </span>
                    </button>

                    {/* Dropdown Menu */}
                    {isProfileDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 animate-in fade-in zoom-in duration-200">
                        <div className="py-2">
                          <button
                            onClick={() => {
                              navigate('/profile');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                          >
                            <User size={16} />
                            My Profile
                          </button>
                          <button
                            onClick={() => {
                              navigate('/messages');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                          >
                            <MessageSquare size={16} />
                            Messages
                          </button>
                          <hr className="my-2" />
                          <button
                            onClick={() => {
                              handleSignOut();
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-red-600"
                          >
                            <LogOut size={16} />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                  <button
                    onClick={() => navigate('/auth')}
                    className="text-slate-600 hover:text-slate-900 font-bold text-xs sm:text-sm px-1 sm:px-2 whitespace-nowrap"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => navigate('/auth')}
                    className="premium-gradient-orange text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl hover:opacity-90 transition-all font-bold text-xs sm:text-sm shadow-lg shadow-orange-200 whitespace-nowrap"
                  >
                    <span className="sm:hidden">Join</span>
                    <span className="hidden sm:inline">Join Mella</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile User Search */}
          <div className="md:hidden pb-4">
            <UserSearch onUserClick={handleUserSearchClick} />
          </div>
        </div>
      </nav>

      {/* User Profile Modal */}
      {selectedUserProfile && (
        <UserProfileModal
          userId={selectedUserProfile}
          onClose={handleCloseUserProfile}
        />
      )}
    </>
  );
};
