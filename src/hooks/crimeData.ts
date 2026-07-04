export interface CrimeHotspot {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  severity: 'high' | 'medium' | 'low';
  incidents: number;
  type: string;
  label: string;
}

export const CRIME_HOTSPOTS: CrimeHotspot[] = [
  // High severity — Merkato / Piazza area (busy markets, higher petty crime)
  { id: 'c1', lat: 9.0380, lng: 38.7480, radius: 600, severity: 'high', incidents: 47, type: 'Theft', label: 'Piazza — High theft area' },
  { id: 'c2', lat: 9.0300, lng: 38.7520, radius: 500, severity: 'high', incidents: 52, type: 'Pickpocketing', label: 'Merkato — Dense market area' },
  { id: 'c3', lat: 9.0450, lng: 38.7400, radius: 450, severity: 'high', incidents: 38, type: 'Burglary', label: 'Addis Ketema — Break-in reports' },

  // Medium severity — Bole / Kazanchis
  { id: 'c4', lat: 8.9950, lng: 38.8050, radius: 500, severity: 'medium', incidents: 24, type: 'Car Break-in', label: 'Bole — Vehicle break-ins reported' },
  { id: 'c5', lat: 9.0100, lng: 38.7800, radius: 400, severity: 'medium', incidents: 19, type: 'Assault', label: 'Kazanchis — Night incidents' },
  { id: 'c6', lat: 9.0050, lng: 38.7650, radius: 350, severity: 'medium', incidents: 15, type: 'Robbery', label: 'Sarbet — Street robberies' },
  { id: 'c7', lat: 9.0250, lng: 38.7700, radius: 400, severity: 'medium', incidents: 21, type: 'Theft', label: 'Lideta — Residential theft' },

  // Low severity — outskirts / CMC / Summit
  { id: 'c8', lat: 9.0080, lng: 38.7850, radius: 300, severity: 'low', incidents: 8, type: 'Suspicious Activity', label: 'CMC — Loitering reports' },
  { id: 'c9', lat: 9.0150, lng: 38.7950, radius: 300, severity: 'low', incidents: 6, type: 'Vandalism', label: 'Summit — Property damage' },
  { id: 'c10', lat: 9.0350, lng: 38.7600, radius: 250, severity: 'low', incidents: 5, type: 'Disturbance', label: 'Arada — Noise complaints' },
];

export function getSeverityColor(severity: CrimeHotspot['severity']): string {
  if (severity === 'high') return '#dc2626';
  if (severity === 'medium') return '#f97316';
  return '#eab308';
}

export function getSeverityOpacity(severity: CrimeHotspot['severity']): number {
  if (severity === 'high') return 0.25;
  if (severity === 'medium') return 0.18;
  return 0.1;
}

export function getSeverityLabel(severity: CrimeHotspot['severity']): string {
  if (severity === 'high') return 'High Crime Zone';
  if (severity === 'medium') return 'Moderate Crime Zone';
  return 'Low Crime Zone';
}

export function isInCrimeZone(lat: number, lng: number, radiusKm: number = 50): CrimeHotspot | null {
  for (const hotspot of CRIME_HOTSPOTS) {
    const d = calculateDistance(lat, lng, hotspot.lat, hotspot.lng);
    if (d <= hotspot.radius / 1000) {
      return hotspot;
    }
  }
  return null;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
