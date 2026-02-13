
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationSystem } from './NotificationSystem';
import { UserSearch } from './UserSearch';
import { UserProfileModal } from './UserProfile';
import { User, LogOut, MessageSquare, Home, Plus, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

import { Button } from '@/components/ui/button';

interface NavbarProps {
  onPostAd?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onPostAd }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [selectedUserProfile, setSelectedUserProfile] = useState<string | null>(null);

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
      <nav className="bg-white shadow-lg border-b-4 border-orange-500 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <div className="bg-orange-500 text-white p-2 rounded-lg">
                <Home size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Mella</h1>
                <p className="text-xs text-gray-600">Connect. Share. Discover.</p>
              </div>
            </div>

            {/* Center - User Search */}
            <div className="hidden md:block flex-1 max-w-md mx-8">
              <UserSearch onUserClick={handleUserSearchClick} />
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {/* Language Switcher */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
                className="flex items-center gap-1 text-gray-600 hover:text-orange-600"
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
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Share</span>
                  </button>

                  {/* Profile Dropdown */}
                  <div className="relative group">
                    <button
                      className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => navigate('/profile')}
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
                        {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                      </span>
                    </button>

                    {/* Dropdown Menu */}
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <div className="py-2">
                        <button
                          onClick={() => navigate('/profile')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                        >
                          <User size={16} />
                          My Profile
                        </button>
                        <button
                          onClick={() => navigate('/messages')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                        >
                          <MessageSquare size={16} />
                          Messages
                        </button>
                        <hr className="my-2" />
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-red-600"
                        >
                          <LogOut size={16} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigate('/auth')}
                    className="text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => navigate('/auth')}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Join Mella
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
