import { useEffect, useState, useCallback, useRef } from 'react'
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
  // User profile information
  user_profile?: {
    full_name: string | null
    phone: string | null
    profile_image_url: string | null
  }
}

export function useEmergencyRequests() {
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [history, setHistory] = useState<EmergencyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userCategory, setUserCategory] = useState<string | null>(null)

  // Get user info on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user
      if (user) {
        setUserId(user.id)
        setUserCategory(user.user_metadata?.category || null)
      }
    })
  }, [])

  const fetchRequests = useCallback(async () => {
    try {
      // Fetch active requests - filter by category if worker has one
      let query = supabase
        .from('emergency_requests' as any)
        .select('*')
        .in('status', ['pending', 'accepted', 'en_route'])
        .order('created_at', { ascending: false })

      const { data: activeData, error: activeError } = await query

      if (activeError) {
        console.error('Error fetching requests:', activeError)
      }

      // Filter pending requests to only show matching category
      let filteredData = (activeData || []) as EmergencyRequest[]
      if (userCategory) {
        filteredData = filteredData.filter(r => {
          // Show pending requests for matching category or no category
          if (r.status === 'pending') {
            return !r.category || r.category === userCategory
          }
          // Show accepted/en_route requests only if assigned to this responder
          return r.responder_id === userId
        })
      }

      // Fetch user profiles for all requests
      if (filteredData.length > 0) {
        const userIds = [...new Set(filteredData.map(r => r.user_id))]
        const { data: profiles } = await supabase
          .from('profiles' as any)
          .select('id, full_name, phone, profile_image_url')
          .in('id', userIds)

        if (profiles) {
          const profileMap = new Map(profiles.map((p: any) => [p.id, p]))
          filteredData = filteredData.map(r => ({
            ...r,
            user_profile: profileMap.get(r.user_id) || null
          }))
        }
      }

      setRequests(filteredData)

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
    } catch (e) {
      console.error('Error in fetchRequests:', e)
      setLoading(false)
    }
  }, [userId, userCategory])

  const accept = async (id: string, responderId: string) => {
    try {
      // First check if request is still available
      const { data: checkData } = await supabase
        .from('emergency_requests' as any)
        .select('status, responder_id')
        .eq('id', id)
        .single()

      if (checkData?.status !== 'pending' || checkData?.responder_id) {
        alert('This request has already been taken by another responder')
        fetchRequests()
        return
      }

      const { error } = await supabase
        .from('emergency_requests' as any)
        .update({
          status: 'accepted',
          responder_id: responderId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .is('responder_id', null)
        .eq('status', 'pending')

      if (error) {
        console.error('Error accepting request:', error)
        alert('Failed to accept request. It may have been taken by another responder.')
      }

      fetchRequests()
    } catch (e) {
      console.error('Error accepting:', e)
    }
  }

  const decline = async (id: string) => {
    try {
      // For decline, we just hide it from this responder's view
      // The request stays pending for other responders
      const { error } = await supabase
        .from('emergency_requests' as any)
        .update({
          status: 'declined',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('status', 'pending')

      if (error) console.error('Error declining:', error)
      fetchRequests()
    } catch (e) {
      console.error('Error declining:', e)
    }
  }

  const updateStatus = async (
    id: string,
    status: EmergencyRequest['status'],
    location?: { lat: number; lng: number }
  ) => {
    try {
      const update: any = {
        status,
        updated_at: new Date().toISOString()
      }

      if (location) {
        update.responder_location_lat = location.lat
        update.responder_location_lng = location.lng
      }

      const { error } = await supabase
        .from('emergency_requests' as any)
        .update(update)
        .eq('id', id)

      if (error) console.error('Error updating status:', error)
      fetchRequests()
    } catch (e) {
      console.error('Error updating status:', e)
    }
  }

  // Update responder location periodically when en_route
  const updateLocation = useCallback(async (
    id: string,
    location: { lat: number; lng: number }
  ) => {
    try {
      await supabase
        .from('emergency_requests' as any)
        .update({
          responder_location_lat: location.lat,
          responder_location_lng: location.lng,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    } catch (e) {
      console.error('Error updating location:', e)
    }
  }, [])

  useEffect(() => {
    fetchRequests()

    // Set up real-time subscription
    const ch = supabase
      .channel('emergency-requests-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_requests'
        },
        (payload) => {
          console.log('Real-time update:', payload)
          fetchRequests()
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })

    return () => {
      supabase.removeChannel(ch)
    }
  }, [fetchRequests])

  return {
    requests,
    history,
    loading,
    accept,
    decline,
    updateStatus,
    updateLocation,
    refetch: fetchRequests
  }
}
