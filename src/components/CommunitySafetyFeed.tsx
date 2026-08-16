import React from 'react';
import { AlertTriangle, Shield, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CRIME_HOTSPOTS, getSeverityLabel, getSeverityColor } from '@/hooks/crimeData';

interface CommunitySafetyFeedProps {
  userLocation: { lat: number; lng: number };
}

export const CommunitySafetyFeed: React.FC<CommunitySafetyFeedProps> = ({ userLocation }) => {
  const nearby = CRIME_HOTSPOTS
    .map(hotspot => {
      const distance = Math.sqrt(
        Math.pow((userLocation.lat - hotspot.lat) * 111, 2) +
        Math.pow((userLocation.lng - hotspot.lng) * 111, 2)
      );
      return { ...hotspot, distance };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);

  return (
    <Card className="overflow-hidden border-red-100 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-3 text-white">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4" />
          Community safety feed
        </CardTitle>
        <p className="text-xs text-white/75">
          Nearby hazards and verified risk zones around your current location.
        </p>
      </CardHeader>
      <CardContent className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
        {nearby.map((hotspot) => (
          <div key={hotspot.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  <p className="text-sm font-semibold text-gray-800">{hotspot.type}</p>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{hotspot.label}</p>
              </div>
              <Badge
                variant="secondary"
                className="shrink-0 text-[10px]"
                style={{ backgroundColor: `${getSeverityColor(hotspot.severity)}15`, color: getSeverityColor(hotspot.severity) }}
              >
                {getSeverityLabel(hotspot.severity)}
              </Badge>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
              <MapPin className="h-3 w-3" />
              <span>{hotspot.distance.toFixed(1)} km away</span>
              <span>•</span>
              <span>{hotspot.incidents} recent reports</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
