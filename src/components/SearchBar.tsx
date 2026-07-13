
import React, { useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import AmharicVoiceInput from './AmharicVoiceInput';

interface SearchBarProps {
  onSearch: (query: string, location?: { lat: number; lng: number }, radius?: number) => void;
  userLocation?: { lat: number; lng: number };
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, userLocation }) => {
  const [query, setQuery] = useState('');
  const [useLocation, setUseLocation] = useState(false);
  const [radius, setRadius] = useState(10);

  const handleSearch = () => {
    const searchLocation = useLocation ? userLocation : undefined;
    const searchRadius = useLocation ? radius : undefined;
    onSearch(query, searchLocation, searchRadius);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-6">
      <div className="flex flex-col space-y-4">
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search for services, categories, or descriptions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>
          <AmharicVoiceInput 
            onResult={(text) => {
              setQuery(text);
              onSearch(text, useLocation ? userLocation : undefined, useLocation ? radius : undefined);
            }} 
            className="px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300 font-medium"
          >
            <span className="hidden sm:inline">Amharic</span>
          </AmharicVoiceInput>
        </div>
        
        {userLocation && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useLocation"
                checked={useLocation}
                onChange={(e) => setUseLocation(e.target.checked)}
                className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="useLocation" className="flex items-center space-x-1 text-sm text-gray-600 dark:text-slate-300">
                <MapPin size={16} />
                <span>Search near my location</span>
              </label>
            </div>
            
            {useLocation && (
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600 dark:text-slate-300">Radius:</label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="border border-gray-200 dark:border-slate-600 rounded px-2 py-1 text-sm dark:bg-slate-700 dark:text-slate-100"
                >
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={25}>25 km</option>
                  <option value={50}>50 km</option>
                  <option value={100}>100 km</option>
                </select>
              </div>
            )}
          </div>
        )}
        
        <button
          onClick={handleSearch}
          className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium"
        >
          Search
        </button>
      </div>
    </div>
  );
};
