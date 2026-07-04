import React, { useEffect, useRef, useState } from 'react';
import { GoogleMap, LoadScript, Circle } from '@react-google-maps/api';
import { supabase } from '../integrations/supabase/client';

const containerStyle = {
  width: '100%',
  height: '384px',
  borderRadius: '0.75rem',
};

const center = { lat: 9.0128, lng: 38.7575 }; // Addis Ababa

interface DemandPoint {
  lat: number;
  lng: number;
}

const DemandHeatmapGoogle: React.FC = () => {
  const [points, setPoints] = useState<DemandPoint[]>([]);

  useEffect(() => {
    const fetchDemandData = async () => {
      const { data } = await supabase
        .from('emergency_requests')
        .select('location_lat, location_lng')
        .limit(100);

      if (data) {
        const pts: DemandPoint[] = [];
        data.forEach(req => {
          if (req.location_lat && req.location_lng) {
            pts.push({ lat: req.location_lat, lng: req.location_lng });
          }
        });
        setPoints(pts);
      }
    };
    fetchDemandData();
  }, []);

  return (
    <div className="glass p-6 rounded-2xl shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">Demand Heatmap</h3>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">High Demand Zones</span>
        </div>
      </div>
      <div className="h-96 w-full rounded-xl overflow-hidden shadow-inner border border-gray-100">
        <LoadScript googleMapsApiKey="AIzaSyBs3GqItt4UlMnRFZEkXNWZxQUkdYxOeRk">
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={13}
            options={{
              zoomControl: false,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
            }}
          >
            {points.map((pt, i) => (
              <React.Fragment key={i}>
                <Circle
                  center={pt}
                  radius={500}
                  options={{
                    fillColor: '#ef4444',
                    fillOpacity: 0.15,
                    strokeColor: 'transparent',
                    strokeOpacity: 0,
                    strokeWeight: 0,
                  }}
                />
                <Circle
                  center={pt}
                  radius={200}
                  options={{
                    fillColor: '#ef4444',
                    fillOpacity: 0.3,
                    strokeColor: 'transparent',
                    strokeOpacity: 0,
                    strokeWeight: 0,
                  }}
                />
              </React.Fragment>
            ))}
          </GoogleMap>
        </LoadScript>
      </div>
      <p className="text-xs text-gray-400 italic">Areas with high emergency frequency & service requests.</p>
    </div>
  );
};

export default DemandHeatmapGoogle;
