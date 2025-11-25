import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../integrations/supabase/client'

export type EmergencyRequest = {
  id: string
  user_id: string
  responder_id: string | null
  status: 'pending' | 'accepted' | 'declined' | 'en_route' | 'completed' | 'cancelled'
  category: string | null
  details: string | null
  user_location_lat: number | null
  user_location_lng: number | null
  responder_location_lat: number | null
  responder_location_lng: number | null
  created_at: string
  updated_at: string | null
}

export function useEmergencyRequests() {
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [history, setHistory] = useState<EmergencyRequest[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRequests = useCallback(async () => {
    // Fetch active requests
    const { data: activeData, error: activeError } = await supabase
      .from('emergency_requests' as any)
      .select('*')
      .in('status', ['pending', 'accepted', 'en_route'])
      .order('created_at', { ascending: false })

    if (activeError) console.error(activeError)
    setRequests((activeData || []) as EmergencyRequest[])

    // Fetch history (completed/cancelled) for this responder
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: historyData, error: historyError } = await supabase
        .from('emergency_requests' as any)
        .select('*')
        .eq('responder_id', user.id)
        .in('status', ['completed', 'cancelled', 'declined'])
        .order('created_at', { ascending: false })
        .limit(50)

      if (historyError) console.error(historyError)
      setHistory((historyData || []) as EmergencyRequest[])
    }

    setLoading(false)
  }, [])

  const accept = async (id: string, responderId: string) => {
    const { error } = await supabase
      .from('emergency_requests' as any)
      .update({ status: 'accepted', responder_id: responderId })
      .eq('id', id)
      .is('responder_id', null)
      .eq('status', 'pending')
    if (error) console.error(error)
    fetchRequests()
  }

  const decline = async (id: string) => {
    const { error } = await supabase
      .from('emergency_requests' as any)
      .update({ status: 'declined' })
      .eq('id', id)
    if (error) console.error(error)
    fetchRequests()
  }

  const updateStatus = async (
    id: string,
    status: EmergencyRequest['status'],
    location?: { lat: number; lng: number }
  ) => {
    const update: any = { status }
    if (location) {
      update.responder_location_lat = location.lat
      update.responder_location_lng = location.lng
    }
    const { error } = await supabase
      .from('emergency_requests' as any)
      .update(update)
      .eq('id', id)
    if (error) console.error(error)
    fetchRequests()
  }

  useEffect(() => {
    fetchRequests()
    const ch = supabase
      .channel('emergency-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_requests' as any }, fetchRequests)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchRequests])

  return { requests, history, loading, accept, decline, updateStatus, refetch: fetchRequests }
}
