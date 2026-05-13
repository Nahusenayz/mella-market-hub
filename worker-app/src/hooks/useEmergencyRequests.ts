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
  estimated_price?: number | null
  // User profile information
  user_profile?: {
    full_name: string | null
    phone_number: string | null
    profile_image_url: string | null
  }
}

export function useEmergencyRequests() {
  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [history, setHistory] = useState<EmergencyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userCategory, setUserCategory] = useState<string | null>(null)
  const [declinedIds, setDeclinedIds] = useState<string[]>([])

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
      // Filter out requests this worker has already declined in this session
      filteredData = filteredData.filter(r => !declinedIds.includes(r.id))

      if (userCategory) {
        filteredData = filteredData.filter(r => {
          // Show pending requests for matching category or no category
          if (r.status === 'pending') {
            const matchesCategory = !r.category || r.category === userCategory
            const isUnassigned = !r.responder_id
            const isAssignedToMe = r.responder_id === userId
            return matchesCategory && (isUnassigned || isAssignedToMe)
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
          .select('id, full_name, phone_number, profile_image_url')
          .in('id', userIds)

        if (profiles) {
          const profileMap = new Map(profiles.map((p: any) => [p.id, p]))
          filteredData = filteredData.map(r => {
            const profile = profileMap.get(r.user_id) as any;
            let price = null;
            try {
              if (r.details?.startsWith('{')) {
                const parsed = JSON.parse(r.details);
                price = parsed.price;
              }
            } catch (e) {}
            
            return {
              ...r,
              user_profile: profile ? {
                full_name: profile.full_name,
                phone_number: profile.phone_number,
                profile_image_url: profile.profile_image_url
              } : null,
              estimated_price: price
            };
          })
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
        const historyWithPrice = (historyData || []).map((r: any) => {
          let price = null;
          try {
            if (r.details?.startsWith('{')) {
              const parsed = JSON.parse(r.details);
              price = parsed.price;
            }
          } catch (e) {}
          return { ...r, estimated_price: price };
        });
        setHistory(historyWithPrice as EmergencyRequest[])
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

      if (checkData?.status !== 'pending' || (checkData?.responder_id && checkData?.responder_id !== responderId)) {
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
        .or(`responder_id.is.null,responder_id.eq.${responderId}`)
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
      // If a worker declines, we reset it to pending and clear responder_id 
      // so other responders in that category can take it
      const { error } = await supabase
        .from('emergency_requests' as any)
        .update({
          status: 'pending',
          responder_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('status', 'pending')

      if (error) {
        console.error('Error declining:', error)
      } else {
        setDeclinedIds(prev => [...prev, id])
        alert('Request declined. It will be sent to other responders.')
      }
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
      const isWorkerCancellation = status === 'cancelled';
      const update: any = {
        status: isWorkerCancellation ? 'pending' : status,
        updated_at: new Date().toISOString()
      }

      // If worker cancels, we MUST set responder_id to null explicitly
      if (isWorkerCancellation) {
        update.responder_id = null;
      }

      if (location) {
        update.responder_location_lat = location.lat
        update.responder_location_lng = location.lng
      }

      const { error } = await supabase
        .from('emergency_requests' as any)
        .update(update)
        .eq('id', id)

      if (error) {
        console.error('Error updating status:', error)
      } else {
        if (status === 'cancelled') {
          // Add to local history before it disappears from the server-side history query
          const cancelledItem = requests.find(r => r.id === id);
          if (cancelledItem) {
            setHistory(prev => [{
              ...cancelledItem,
              status: 'declined',
              updated_at: new Date().toISOString()
            }, ...prev]);
          }
          setDeclinedIds(prev => [...prev, id])
          alert('Request re-queued. It is now available for other responders.')
        }
      }
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
