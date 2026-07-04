import React, { useEffect, useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react'

interface LeaderboardEntry {
  rank: number
  worker_id: string
  full_name: string
  completed_jobs: number
  total_earnings: number
}

export default function WorkerLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)
      const { data: bookings } = await supabase
        .from('bookings')
        .select('worker_id, ads!inner(price)')
        .eq('status', 'completed')

      if (!bookings || bookings.length === 0) {
        setLoading(false)
        return
      }

      const counts: Record<string, { jobs: number; earnings: number }> = {}
      bookings.forEach((b: any) => {
        if (!counts[b.worker_id]) counts[b.worker_id] = { jobs: 0, earnings: 0 }
        counts[b.worker_id].jobs++
        counts[b.worker_id].earnings += Number(b.ads?.price || 0)
      })

      const workerIds = Object.keys(counts)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', workerIds)

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || 'Worker']))

      const sorted = workerIds
        .map(id => ({
          rank: 0,
          worker_id: id,
          full_name: profileMap.get(id) || 'Worker',
          completed_jobs: counts[id].jobs,
          total_earnings: counts[id].earnings
        }))
        .sort((a, b) => b.completed_jobs - a.completed_jobs)
        .slice(0, 10)
        .map((entry, i) => ({ ...entry, rank: i + 1 }))

      setEntries(sorted)
      setLoading(false)
    }

    fetchLeaderboard()
  }, [])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2: return <Medal className="h-5 w-5 text-gray-400" />
      case 3: return <Award className="h-5 w-5 text-amber-600" />
      default: return <span className="text-sm font-black text-slate-400 w-5 text-center">{rank}</span>
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-[32px] p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (entries.length === 0) return null

  return (
    <div className="glass rounded-[32px] p-6 border border-white/40 shadow-xl">
      <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-6">
        <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <Trophy className="h-5 w-5" />
        </div>
        Top Workers
      </h3>

      <div className="space-y-2">
        {entries.map(entry => (
          <div
            key={entry.worker_id}
            className={`flex items-center gap-4 p-3 rounded-2xl transition-all ${
              entry.rank <= 3 ? 'bg-amber-50 border border-amber-100' : 'bg-white/60 border border-slate-100'
            }`}
          >
            <div className="flex items-center justify-center w-8">
              {getRankIcon(entry.rank)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{entry.full_name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{entry.completed_jobs} jobs completed</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-emerald-600">ETB {entry.total_earnings.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
