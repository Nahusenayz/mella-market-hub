import React, { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useRealTimeAds } from '@/hooks/useRealTimeAds';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

// Lightweight 3D map page using Mapbox GL JS (free tier).
// Token is provided by the user and stored in localStorage (no env vars).

const emergencyStations = [
  { id: 'e1', name: 'Tikur Anbessa Hospital', type: 'hospital', coords: [38.7639, 9.0366] },
  { id: 'e2', name: 'Federal Police HQ', type: 'police', coords: [38.74, 9.03] },
  { id: 'e3', name: 'Addis Fire & Emergency', type: 'fire', coords: [38.75, 9.025] },
  { id: 'e4', name: 'Ambulance Service Center', type: 'ambulance', coords: [38.758, 9.018] },
];

const iconForType = (type?: string) => {
  switch (type) {
    case 'hospital': return '🏥';
    case 'police': return '🚔';
    case 'fire': return '🚒';
    case 'ambulance': return '🚑';
    default: return '📌';
  }
};

const Map3D: React.FC = () => {
  const navigate = useNavigate();
  const { ads } = useRealTimeAds();
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Pre-set the token to avoid manual input
  const defaultToken = 'pk.eyJ1IjoibmFodTEzIiwiYSI6ImNtZThlbWwxbjBiNGEybHM4d3FxeDk5dDUifQ.uWvrvBCPejGkD9vk-7545g';
  const [token, setToken] = useState<string>(() => {
    const stored = localStorage.getItem('mapbox_token');
    if (!stored) {
      localStorage.setItem('mapbox_token', defaultToken);
      return defaultToken;
    }
    return stored;
  });
  
  const [center, setCenter] = useState<[number, number]>(() => [38.7469, 9.032]); // Addis default

  // Ask geolocation to center the map (non-blocking)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCenter([pos.coords.longitude, pos.coords.latitude]);
      });
    }
  }, []);

  // Initialize map when token and container exist
  useEffect(() => {
    if (!token || !mapContainer.current) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center,
      zoom: 12,
      pitch: 55,
      bearing: -10,
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

    map.on('load', () => {
      // 3D buildings layer
      const layers = map.getStyle().layers || [];
      const labelLayerId = layers.find(
        (l: any) => l.type === 'symbol' && l.layout && l.layout['text-field']
      )?.id;

      map.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#ddd',
            'fill-extrusion-height': [
              'interpolate', ['linear'], ['zoom'],
              15, 0,
              15.05, ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate', ['linear'], ['zoom'],
              15, 0,
              15.05, ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.6
          }
        },
        labelLayerId
      );
    });

    mapRef.current = map;
    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
    };
  }, [token, mapContainer.current]);

  // Update center if it changes after map init
  useEffect(() => {
    const map = mapRef.current;
    if (map && center) {
      map.setCenter(center);
    }
  }, [center]);

  // Render markers for ads and emergency stations
  const items = useMemo(() => {
    const adItems = (ads || []).map((ad: any) => ({
      id: ad.id,
      coords: [ad.location_lng, ad.location_lat] as [number, number],
      label: ad.title,
      type: 'ad',
    })).filter(i => i.coords[0] && i.coords[1]);

    const emergencyItems = emergencyStations.map(s => ({
      id: s.id,
      coords: s.coords as [number, number],
      label: s.name,
      type: s.type,
    }));

    return [...emergencyItems, ...adItems];
  }, [ads]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add markers
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'rounded-full shadow-md bg-white text-xs px-2 py-1';
      el.style.transform = 'translate(-50%, -50%)';
      el.style.whiteSpace = 'nowrap';
      el.style.pointerEvents = 'auto';
      el.textContent = `${iconForType(item.type)} ${item.label}`;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(item.coords)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [items]);

  const handleSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('mapbox_token', token);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          ← Back
        </Button>
        <div className="text-center font-semibold">3D Map</div>
        <div />
      </div>

      {!token && (
        <div className="container mx-auto px-4 pb-4">
          <form onSubmit={handleSaveToken} className="bg-white rounded-xl p-4 shadow">
            <label className="block text-sm font-medium mb-2">Mapbox Public Token</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              placeholder="pk.eyJ..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Paste your Mapbox public token (free tier). It will be stored locally in your browser.
            </p>
            <div className="mt-3">
              <Button type="submit">Save & Load Map</Button>
            </div>
          </form>
        </div>
      )}

      <div className="container mx-auto px-4 pb-6">
        <div className="w-full h-[70vh] rounded-xl overflow-hidden shadow relative">
          <div ref={mapContainer} className="absolute inset-0" />
          {!token && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center text-gray-700">Enter your Mapbox token to load the 3D map.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Map3D;
