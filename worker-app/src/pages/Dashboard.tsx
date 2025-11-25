import React, { useEffect, useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { useEmergencyRequests } from '../hooks/useEmergencyRequests'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const nav = useNavigate()
  const [userId, setUserId] = useState<string | null>(null)
  const [userCategory, setUserCategory] = useState<string>('police')
  const [userName, setUserName] = useState<string>('')
  const { requests, history, loading, accept, decline, updateStatus } = useEmergencyRequests()
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user
      if (!user) {
        nav('/login')
        return
      }
      setUserId(user.id)
      setUserName(user.user_metadata.full_name || 'Worker')
      setUserCategory(user.user_metadata.category || 'police')
    })
  }, [nav])

  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      p => setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => { },
      { enableHighAccuracy: true, maximumAge: 60000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const getTheme = (cat: string) => {
    switch (cat) {
      case 'police': return { bg: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', icon: '👮', label: 'Police Officer' }
      case 'ambulance': return { bg: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', icon: '🚑', label: 'Paramedic' }
      case 'traffic_police': return { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', icon: '🚦', label: 'Traffic Control' }
      case 'fire_truck': return { bg: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', icon: '🚒', label: 'Firefighter' }
      case 'tow_truck': return { bg: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)', icon: '🏗️', label: 'Tow Operator' }
      default: return { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: '👷', label: 'Worker' }
    }
  }

  const theme = getTheme(userCategory)

  if (loading) return <div className="loading">Loading dashboard...</div>

  return (
    <div className="container">
      <div
        style={{
          background: theme.bg,
          padding: '2rem',
          borderRadius: '16px',
          color: 'white',
          marginBottom: '2rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }}
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>{theme.icon} {theme.label} Dashboard</h1>
            <p style={{ opacity: 0.9 }}>Welcome back, {userName}</p>
          </div>
          <button className="btn-signout" onClick={async () => { await supabase.auth.signOut(); nav('/login') }} style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)' }}>Sign out</button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2>Incoming and Active Requests</h2>
      </div>

      {requests.length === 0 && <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', textAlign: 'center', color: '#6b7280' }}>No active requests at the moment</div>}

      <div className="flex flex-col gap-3 mb-8">
        {requests.map(r => (
          <div key={r.id} className="request-card" style={{ borderLeft: `4px solid ${userCategory === 'ambulance' ? '#dc2626' : '#1e40af'}` }}>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold" style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>{r.category || 'Emergency Request'}</div>
                <div className="text-gray text-sm" style={{ marginBottom: '0.5rem' }}>{r.details || 'No additional details provided'}</div>
                {r.user_location_lat && r.user_location_lng ? (
                  <a href={`https://maps.google.com/?q=${r.user_location_lat},${r.user_location_lng}`} target="_blank" rel="noreferrer">
                    📍 Navigate to caller location
                  </a>
                ) : <div className="text-gray text-sm">📍 Caller location unavailable</div>}
              </div>
              <div>
                <span className={`status-badge ${r.status}`}>{r.status.replace('_', ' ')}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4" style={{ flexWrap: 'wrap' }}>
              {r.status === 'pending' && (
                <>
                  <button onClick={() => userId && accept(r.id, userId)} className="btn-accept">✓ Accept Request</button>
                  <button onClick={() => decline(r.id)} className="btn-decline">✗ Decline</button>
                </>
              )}
              {r.status === 'accepted' && (
                <button onClick={() => loc && updateStatus(r.id, 'en_route', loc)} className="btn-enroute">🚗 Start En Route</button>
              )}
              {r.status === 'en_route' && (
                <button onClick={() => updateStatus(r.id, 'completed')} className="btn-complete">✓ Mark Completed</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2>Work History</h2>
      </div>

      {history.length === 0 && <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No completed jobs yet.</div>}

      <div className="flex flex-col gap-3">
        {history.map(r => (
          <div key={r.id} style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold">{r.category || 'Emergency'}</div>
                <div className="text-sm text-gray">{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <span className={`status-badge ${r.status}`} style={{ transform: 'scale(0.9)' }}>{r.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
