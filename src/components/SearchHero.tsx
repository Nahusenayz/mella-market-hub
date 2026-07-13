
import React from 'react';
import { Phone, MapPin } from 'lucide-react';
import { useLocation } from '@/contexts/LocationContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

interface SearchHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isWorkerMode: boolean;
  onTowTruckClick?: () => void;
  responderCounts?: Record<string, number>;
}

export const SearchHero: React.FC<SearchHeroProps> = ({
  searchQuery,
  onSearchChange,
  isWorkerMode,
  onTowTruckClick,
  responderCounts = {}
}) => {
  const { t } = useLanguage();
  const { location: contextLocation, permissionStatus } = useLocation();
  const navigate = useNavigate();

  const userLocation = contextLocation || { lat: 9.0320, lng: 38.7469 };
  const isLocationTracking = permissionStatus === 'granted';

  const emergencyTypes = [
    { type: 'Police', icon: '🚔', color: 'bg-blue-600 hover:bg-blue-700', label: t('police'), workerCategory: 'police' },
    { type: 'Traffic', icon: '🚦', color: 'bg-yellow-600 hover:bg-yellow-700', label: t('trafficPolice'), workerCategory: 'traffic_police' },
    { type: 'Ambulance', icon: '🚑', color: 'bg-red-600 hover:bg-red-700', label: t('ambulance'), workerCategory: 'ambulance' },
    { type: 'Fire Station', icon: '🚒', color: 'bg-orange-600 hover:bg-orange-700', label: t('fireStation'), workerCategory: 'fire_truck' },
    { type: 'Tow Truck', icon: '🏗️', color: 'bg-blue-600 hover:bg-blue-700', label: t('towTruck'), workerCategory: 'tow_truck' }
  ];

  if (isWorkerMode) {
    return (
      <div className="bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
              Offer Your Services
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              Connect with customers in your area and grow your business
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                <MapPin size={16} />
                <span>Local Customers</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                <Phone size={16} />
                <span>Direct Contact</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white min-h-[40vh] sm:min-h-[45vh]">
      <div className="container mx-auto px-4 py-4 sm:py-6">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl sm:text-3xl">🚨</span>
            <h1 className="text-2xl md:text-4xl font-bold animate-fade-in">
              {t('emergencyTitle')}
            </h1>
          </div>
          <p className="text-base md:text-lg mb-6 opacity-90 max-w-2xl mx-auto">
            {t('emergencyDescription')}
          </p>

          {/* Location Status */}
          <div className="mb-6 bg-white/10 backdrop-blur-sm rounded-xl p-2 sm:p-3 max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
              <div className={`w-2 h-2 rounded-full ${isLocationTracking ? 'bg-green-400' : 'bg-gray-400'}`}></div>
              <MapPin size={16} />
              <span>{isLocationTracking ? t('usingLiveLocation') : t('usingDefaultLocation')}</span>
            </div>
          </div>

          {/* Emergency Category Buttons with Responder Counts */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 max-w-4xl mx-auto pb-4 px-1">
            {emergencyTypes.map((emergency) => {
              const count = responderCounts[emergency.workerCategory] ?? 0;
              return (
                <button
                  key={emergency.type}
                  onClick={() => {
                    if (emergency.type === 'Tow Truck' && onTowTruckClick) {
                      onTowTruckClick();
                    }
                    navigate('/emergency', { state: { category: emergency.workerCategory } });
                  }}
                  className={`${emergency.color} text-white p-3 sm:p-4 md:px-6 md:py-5 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex flex-col items-center gap-1 sm:gap-2 border-2 border-white/10 md:min-w-[120px] relative`}
                >
                  <span className="text-2xl sm:text-3xl">{emergency.icon}</span>
                  <span className="text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wider">{emergency.label}</span>
                  <span className="inline-flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-bold mt-0.5 min-w-[28px]">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
