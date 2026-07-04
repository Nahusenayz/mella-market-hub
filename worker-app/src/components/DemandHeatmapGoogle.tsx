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

  const crimeHotspots = [
    { id: 'c1', lat: 9.0380, lng: 38.7480, radius: 600, color: '#dc2626', opacity: 0.25 },
    { id: 'c2', lat: 9.0300, lng: 38.7520, radius: 500, color: '#dc2626', opacity: 0.25 },
    { id: 'c3', lat: 9.0450, lng: 38.7400, radius: 450, color: '#dc2626', opacity: 0.25 },
    { id: 'c4', lat: 8.9950, lng: 38.8050, radius: 500, color: '#f97316', opacity: 0.18 },
    { id: 'c5', lat: 9.0100, lng: 38.7800, radius: 400, color: '#f97316', opacity: 0.18 },
    { id: 'c6', lat: 9.0050, lng: 38.7650, radius: 350, color: '#f97316', opacity: 0.18 },
    { id: 'c7', lat: 9.0250, lng: 38.7700, radius: 400, color: '#f97316', opacity: 0.18 },
    { id: 'c8', lat: 9.0080, lng: 38.7850, radius: 300, color: '#eab308', opacity: 0.1 },
    { id: 'c9', lat: 9.0150, lng: 38.7950, radius: 300, color: '#eab308', opacity: 0.1 },
    { id: 'c10', lat: 9.0350, lng: 38.7600, radius: 250, color: '#eab308', opacity: 0.1 },
  ];

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

            {/* Crime hotspot overlay */}
            {crimeHotspots.map((spot) => (
              <Circle
                key={spot.id}
                center={{ lat: spot.lat, lng: spot.lng }}
                radius={spot.radius}
                options={{
                  fillColor: spot.color,
                  fillOpacity: spot.opacity,
                  strokeColor: spot.color,
                  strokeWeight: 2,
                  strokeOpacity: 0.4,
                }}
              />
            ))}
          </GoogleMap>
        </LoadScript>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
        <p className="italic">Areas with high emergency frequency & service requests.</p>
        <div className="flex items-center gap-3 ml-auto">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Crime: High
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" /> Moderate
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" /> Low
          </span>
        </div>
      </div>
    </div>
  );
};

export default DemandHeatmapGoogle;
