
import React from 'react';
import { MapPin } from 'lucide-react';

interface DistanceFilterProps {
  distanceFilter: number;
  onDistanceChange: (distance: number) => void;
}

export const DistanceFilter: React.FC<DistanceFilterProps> = ({
  distanceFilter,
  onDistanceChange
}) => {
  return (
    <div className="flex items-center gap-3 bg-white border border-orange-200 rounded-lg px-4 py-3">
      <MapPin size={20} className="text-orange-500" />
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Within</span>
        <select
          value={distanceFilter}
          onChange={(e) => onDistanceChange(Number(e.target.value))}
          className="border-0 bg-transparent focus:ring-0 font-medium text-orange-600"
        >
          <option value={1}>1km</option>
          <option value={2}>2km</option>
          <option value={3}>3km</option>
          <option value={4}>4km</option>
          <option value={5}>5km</option>
        </select>
      </div>
    </div>
  );
};
