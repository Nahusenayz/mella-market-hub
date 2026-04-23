
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../integrations/supabase/client';

const DemandHeatmap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = L.map(mapContainer.current, {
      zoomControl: false,
      scrollWheelZoom: true,
    }).setView([9.0128, 38.7575], 13); // Addis Ababa

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map.current);

    const fetchDemandData = async () => {
      // Fetch emergency requests as demand proxy
      const { data } = await supabase
        .from('emergency_requests')
        .select('location_lat, location_lng')
        .limit(100);

      if (data && map.current) {
        data.forEach(req => {
          if (req.location_lat && req.location_lng) {
            L.circle([req.location_lat, req.location_lng], {
              radius: 500,
              fillColor: '#ef4444',
              fillOpacity: 0.15,
              color: 'transparent',
              weight: 0
            }).addTo(map.current!);
            
            // Add a smaller, more intense core
            L.circle([req.location_lat, req.location_lng], {
              radius: 200,
              fillColor: '#ef4444',
              fillOpacity: 0.3,
              color: 'transparent',
              weight: 0
            }).addTo(map.current!);
          }
        });
      }
    };

    fetchDemandData();

    return () => {
      if (map.current) map.current.remove();
    };
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
      <div ref={mapContainer} className="h-96 w-full rounded-xl overflow-hidden shadow-inner border border-gray-100" />
      <p className="text-xs text-gray-400 italic">Areas with high emergency frequency & service requests.</p>
    </div>
  );
};

export default DemandHeatmap;
