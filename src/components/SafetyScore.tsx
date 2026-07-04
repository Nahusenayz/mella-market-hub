import React, { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Shield, ShieldAlert, ShieldCheck, MapPin, Loader2 } from 'lucide-react'

interface SafetyScoreProps {
  location: { lat: number; lng: number }
}

export const SafetyScore: React.FC<SafetyScoreProps> = ({ location }) => {
  const [score, setScore] = useState<{ level: string; color: string; icon: any; label: string; recentIncidents: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSafetyData = async () => {
      setLoading(true)
      const latCluster = Math.round(location.lat * 10) / 10
      const lngCluster = Math.round(location.lng * 10) / 10

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data } = await supabase
        .from('emergency_requests')
        .select('id', { count: 'exact' })
        .gte('created_at', sevenDaysAgo)
        .neq('status', 'cancelled')

      const count = data?.length || 0

      let result
      if (count === 0) {
        result = { level: 'safe', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: ShieldCheck, label: 'Very Safe', recentIncidents: 0 }
      } else if (count < 5) {
        result = { level: 'low', color: 'text-green-600 bg-green-50 border-green-200', icon: Shield, label: 'Safe', recentIncidents: count }
      } else if (count < 15) {
        result = { level: 'moderate', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: ShieldAlert, label: 'Moderate', recentIncidents: count }
      } else {
        result = { level: 'high', color: 'text-red-600 bg-red-50 border-red-200', icon: ShieldAlert, label: 'Caution', recentIncidents: count }
      }
      setScore(result)
      setLoading(false)
    }

    fetchSafetyData()
  }, [location.lat, location.lng])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 size={14} className="animate-spin" />
        Loading safety data...
      </div>
    )
  }

  if (!score) return null

  const Icon = score.icon

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${score.color}`}>
      <Icon size={20} />
      <div className="flex-1">
        <p className="text-sm font-bold">{score.label}</p>
        <p className="text-xs opacity-80">
          {score.recentIncidents === 0
            ? 'No recent incidents reported'
            : `${score.recentIncidents} incident${score.recentIncidents !== 1 ? 's' : ''} in the past 7 days`
          }
        </p>
      </div>
      <MapPin size={16} className="opacity-60" />
    </div>
  )
}
