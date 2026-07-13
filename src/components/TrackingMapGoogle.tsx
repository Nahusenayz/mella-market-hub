import React, { useMemo, useState, useEffect } from 'react';

interface TrackingMapProps {
  userLocation: { lat: number; lng: number };
  responderLocation: { lat: number; lng: number };
  responderType?: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getTrafficMultiplier(): number {
  const hour = new Date().getHours();
  if (hour >= 7 && hour <= 9) return 1.5;
  if (hour >= 12 && hour <= 14) return 1.2;
  if (hour >= 17 && hour <= 20) return 1.8;
  if (hour >= 22 || hour <= 5) return 0.8;
  return 1.0;
}

function estimateMinutes(distanceKm: number): number {
  const avgSpeedKmh = 30;
  const trafficMul = getTrafficMultiplier();
  return Math.max(1, Math.round((distanceKm / avgSpeedKmh) * 60 * trafficMul));
}

const getResponderEmoji = (type: string) => {
  switch (type) {
    case 'police': return '🚓';
    case 'fire_truck': return '🚒';
    case 'traffic_police': return '🏍️';
    case 'tow_truck': return '🔧';
    default: return '🚑';
  }
};

export const TrackingMap: React.FC<TrackingMapProps> = ({
  userLocation,
  responderLocation,
  responderType = 'ambulance'
}) => {
  const [aiEta, setAiEta] = useState<number | null>(null);

  const distanceKm = useMemo(() => haversineKm(
    userLocation.lat, userLocation.lng,
    responderLocation.lat, responderLocation.lng
  ), [userLocation, responderLocation]);

  useEffect(() => {
    if (distanceKm < 0.1) return;
    const timer = setTimeout(async () => {
      try {
        const hour = new Date().getHours();
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Mella Market Hub',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.1-8b-instruct',
            messages: [{ role: 'user', content: `Given a ${distanceKm.toFixed(1)}km trip in Addis Ababa at ${hour}:00, estimate arrival in minutes considering traffic. Return only a number, no text.` }]
          })
        });
        const data = await res.json();
        const num = parseInt(data.choices?.[0]?.message?.content || '', 10);
        if (!isNaN(num) && num > 0) setAiEta(num);
      } catch { /* keep math-based ETA */ }
    }, 10000);
    return () => clearTimeout(timer);
  }, [distanceKm]);

  const etaMinutes = useMemo(() => estimateMinutes(distanceKm), [distanceKm]);

  const progress = useMemo(() => {
    if (distanceKm < 0.01) return 0.5;
    const maxDist = 5;
    return Math.min(distanceKm / maxDist, 1);
  }, [distanceKm]);

  // Normalize coords into SVG viewBox space (padding 60px)
  const pad = 60;
  const vw = 440;
  const vh = 280;
  const innerW = vw - pad * 2;
  const innerH = vh - pad * 2;

  const latMin = Math.min(userLocation.lat, responderLocation.lat);
  const latMax = Math.max(userLocation.lat, responderLocation.lat);
  const lngMin = Math.min(userLocation.lng, responderLocation.lng);
  const lngMax = Math.max(userLocation.lng, responderLocation.lng);

  const latSpan = Math.max(latMax - latMin, 0.005);
  const lngSpan = Math.max(lngMax - lngMin, 0.005);

  const mapX = (lng: number) => pad + ((lng - lngMin) / lngSpan) * innerW;
  const mapY = (lat: number) => pad + ((latMax - lat) / latSpan) * innerH;

  const ux = mapX(userLocation.lng);
  const uy = mapY(userLocation.lat);
  const rx = mapX(responderLocation.lng);
  const ry = mapY(responderLocation.lat);

  return (
    <div className="relative w-full h-full bg-slate-800">
      <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={vw} height={vh} fill="#1e293b" />
        <rect width={vw} height={vh} fill="url(#grid)" />

        {/* Connecting line */}
        <line x1={ux} y1={uy} x2={rx} y2={ry} stroke="#3b82f6" strokeWidth="2" strokeDasharray="6,4" />

        {/* User marker */}
        <g>
          <circle cx={ux} cy={uy} r="14" fill="#2563eb" stroke="white" strokeWidth="3" />
          <circle cx={ux} cy={uy} r="20" fill="#2563eb" opacity="0.15" />
          <text x={ux} y={uy + 28} textAnchor="middle" fill="white" fontSize="11" fontWeight="700">You</text>
        </g>

        {/* Responder marker */}
        <g>
          <rect x={rx - 16} y={ry - 16} width="32" height="32" rx="8" fill="#dc2626" stroke="white" strokeWidth="2" />
          <text x={rx} y={ry + 6} textAnchor="middle" fontSize="16">{getResponderEmoji(responderType)}</text>
          <text x={rx} y={ry + 28} textAnchor="middle" fill="white" fontSize="11" fontWeight="700">Responder</text>
        </g>

        {/* Animated pulse on responder */}
        <circle cx={rx} cy={ry} r="28" fill="none" stroke="#dc2626" strokeWidth="1.5" opacity="0.4">
          <animate attributeName="r" values="20;36;20" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* Cross-street lines */}
        <line x1={pad} y1={ry} x2={vw - pad} y2={ry} stroke="#475569" strokeWidth="0.5" strokeDasharray="3,3" />
        <line x1={rx} y1={pad} x2={rx} y2={vh - pad} stroke="#475569" strokeWidth="0.5" strokeDasharray="3,3" />

        {/* Distance scale */}
        <text x={pad} y={vh - 15} fill="#94a3b8" fontSize="9">{distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}</text>
      </svg>
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 bg-black/60 backdrop-blur rounded-lg px-3 py-1.5">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Live</span>
      </div>
      <div className="absolute top-3 right-3 z-10 bg-black/60 backdrop-blur rounded-lg px-3 py-2 text-sm min-w-[100px]">
        <div className="flex items-center gap-2 text-blue-300 font-medium">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          ETA: {etaMinutes} min
        </div>
        {aiEta && aiEta !== etaMinutes && (
          <div className="flex items-center gap-1 mt-1 text-purple-300">
            <span className="text-[10px]">🤖</span>
            <span className="text-[11px]">AI ETA: ~{aiEta} min</span>
          </div>
        )}
        <div className="text-gray-400 text-xs mt-0.5">
          {distanceKm < 1
            ? `${Math.round(distanceKm * 1000)}m away`
            : `${distanceKm.toFixed(1)}km away`
          }
        </div>
      </div>
    </div>
  );
};
