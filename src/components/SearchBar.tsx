
import React, { useState } from 'react';
import { Search, MapPin } from 'lucide-react';

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
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <div className="flex flex-col space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search for services, categories, or descriptions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
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
              <label htmlFor="useLocation" className="flex items-center space-x-1 text-sm text-gray-600">
                <MapPin size={16} />
                <span>Search near my location</span>
              </label>
            </div>
            
            {useLocation && (
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Radius:</label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="border border-gray-200 rounded px-2 py-1 text-sm"
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
