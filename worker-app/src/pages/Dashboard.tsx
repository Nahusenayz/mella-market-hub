import React, { useEffect, useState, useRef } from 'react'
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
  const [isOnline, setIsOnline] = useState(true)
  const [showNotification, setShowNotification] = useState(false)
  const [newRequestCount, setNewRequestCount] = useState(0)
  const prevRequestsRef = useRef<string[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Check for new requests and play notification
  useEffect(() => {
    const currentIds = requests.filter(r => r.status === 'pending').map(r => r.id)
    const newRequests = currentIds.filter(id => !prevRequestsRef.current.includes(id))

    if (newRequests.length > 0 && prevRequestsRef.current.length > 0) {
      setShowNotification(true)
      setNewRequestCount(newRequests.length)
      if (audioRef.current) {
        audioRef.current.play().catch(() => { })
      }
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🚨 New Emergency Request!', {
          body: `You have ${newRequests.length} new emergency request(s)`,
          icon: '🚨'
        })
      }
      setTimeout(() => setShowNotification(false), 5000)
    }
    prevRequestsRef.current = currentIds
  }, [requests])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

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

  // Location tracking effect
  useEffect(() => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported')
      return
    }
    if (!userId) {
      console.log('No userId yet, waiting...')
      return
    }

    console.log('🔧 Setting up location tracking for:', userId, 'category:', userCategory)

    const saveLocation = async (newLoc: { lat: number; lng: number }) => {
      setLoc(newLoc)
      console.log('📍 Attempting to save location:', newLoc)

      try {
        const { data, error } = await supabase
          .from('worker_locations' as any)
          .upsert({
            worker_id: userId,
            category: userCategory,
            location_lat: newLoc.lat,
            location_lng: newLoc.lng,
            is_available: isOnline,
            last_updated: new Date().toISOString()
          }, { onConflict: 'worker_id' })
          .select()

        if (error) {
          console.error('❌ Error saving location:', error)
        } else {
          console.log('✅ Location saved successfully:', data)
        }
      } catch (err) {
        console.error('💥 Exception saving location:', err)
      }
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        saveLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      (err) => { console.error('Geolocation error:', err) },
      { enableHighAccuracy: true, maximumAge: 60000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [userId, userCategory, isOnline])

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline
    setIsOnline(newStatus)
    if (userId && loc) {
      const { error } = await supabase
        .from('worker_locations' as any)
        .upsert({
          worker_id: userId,
          category: userCategory,
          location_lat: loc.lat,
          location_lng: loc.lng,
          is_available: newStatus,
          last_updated: new Date().toISOString()
        }, { onConflict: 'worker_id' })

      if (error) {
        console.error('Error updating status:', error)
      }
    }
  }

  const getTheme = (cat: string) => {
    switch (cat) {
      case 'police': return { bg: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', icon: '👮', label: 'Police Officer', color: '#1e40af' }
      case 'ambulance': return { bg: 'linear-gradient(135deg, #dc2626 0%, #f87171 100%)', icon: '🚑', label: 'Paramedic', color: '#dc2626' }
      case 'traffic_police': return { bg: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)', icon: '🚦', label: 'Traffic Control', color: '#d97706' }
      case 'fire_truck': return { bg: 'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)', icon: '🚒', label: 'Firefighter', color: '#ea580c' }
      case 'tow_truck': return { bg: 'linear-gradient(135deg, #4b5563 0%, #9ca3af 100%)', icon: '🏗️', label: 'Tow Operator', color: '#4b5563' }
      default: return { bg: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)', icon: '👷', label: 'Worker', color: '#f97316' }
    }
  }

  const theme = getTheme(userCategory)
  const pendingRequests = requests.filter(r => r.status === 'pending')
  const activeRequests = requests.filter(r => r.status !== 'pending')

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return new Date(date).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="loading-spinner" />
        <div className="loading-text">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="container" style={{ paddingTop: '1rem', paddingBottom: '2rem' }}>
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

      {showNotification && (
        <div className="emergency-alert animate-slide-in-right" style={{ marginBottom: '1.5rem' }}>
          <div className="emergency-alert-title">
            <span style={{ animation: 'bounce 1s ease infinite' }}>🚨</span>
            New Emergency Request{newRequestCount > 1 ? 's' : ''}!
          </div>
          <div className="emergency-alert-details">
            You have {newRequestCount} new pending request{newRequestCount > 1 ? 's' : ''} waiting for response
          </div>
        </div>
      )}

      <div className="dashboard-header animate-fade-in" style={{ background: theme.bg }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex justify-between items-center">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '2.5rem' }}>{theme.icon}</span>
                <div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{theme.label} Dashboard</h1>
                  <p style={{ opacity: 0.9, margin: 0, fontSize: '0.875rem' }}>Welcome back, {userName}</p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={toggleOnlineStatus}
                style={{
                  background: isOnline ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                  backdropFilter: 'blur(5px)',
                  padding: '0.5rem 1rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'white',
                  animation: isOnline ? 'pulse 2s ease-in-out infinite' : 'none'
                }} />
                {isOnline ? 'Online' : 'Offline'}
              </button>
              <button
                className="btn-signout"
                onClick={async () => { await supabase.auth.signOut(); nav('/login') }}
                style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)' }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card delay-100" style={{ animationDelay: '0.1s' }}>
          <div className="stat-number">{pendingRequests.length}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card delay-200" style={{ animationDelay: '0.2s' }}>
          <div className="stat-number">{activeRequests.length}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card delay-300" style={{ animationDelay: '0.3s' }}>
          <div className="stat-number">{history.filter(h => h.status === 'completed').length}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card delay-400" style={{ animationDelay: '0.4s' }}>
          <div className="stat-number" style={{ fontSize: '1.5rem' }}>
            {loc ? '📍' : '❌'}
          </div>
          <div className="stat-label">{loc ? 'Location Active' : 'No GPS'}</div>
        </div>
      </div>

      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ animation: 'pulse 2s ease-in-out infinite' }}>🔴</span>
            Pending Requests ({pendingRequests.length})
          </h2>
          <div className="flex flex-col gap-3">
            {pendingRequests.map((r, index) => (
              <div key={r.id} className="request-card pending new-request" style={{ animationDelay: `${index * 0.1}s`, borderLeft: `4px solid ${theme.color}`, background: 'linear-gradient(135deg, #fff 0%, #fff9f9 100%)' }}>
                {/* User Profile Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    color: 'white',
                    fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {r.user_profile?.profile_image_url ? (
                      <img src={r.user_profile.profile_image_url} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      r.user_profile?.full_name?.charAt(0)?.toUpperCase() || '👤'
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#111827' }}>
                      {r.user_profile?.full_name || 'Anonymous User'}
                    </div>
                    {r.user_profile?.phone && (
                      <a href={`tel:${r.user_profile.phone}`} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#3b82f6',
                        fontSize: '0.875rem',
                        textDecoration: 'none'
                      }}>
                        📞 {r.user_profile.phone}
                      </a>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      Requested {formatTimeAgo(r.created_at)}
                    </div>
                  </div>
                  <span className="status-badge pending" style={{
                    animation: 'pulse 2s ease-in-out infinite',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: '1px solid #f59e0b'
                  }}>
                    ⏳ Waiting
                  </span>
                </div>

                {/* Emergency Details */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>
                      {r.category === 'ambulance' ? '🚑' : r.category === 'fire_truck' ? '🚒' : r.category === 'police' ? '👮' : r.category === 'traffic_police' ? '🚦' : r.category === 'tow_truck' ? '🏗️' : '🚨'}
                    </span>
                    <div style={{ fontWeight: 600, fontSize: '1rem', textTransform: 'capitalize' }}>{r.category?.replace('_', ' ') || 'Emergency'} Request</div>
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.875rem', marginLeft: '2rem' }}>
                    {r.details || 'No additional details provided'}
                  </div>
                </div>

                {/* Location Link */}
                {r.user_location_lat && r.user_location_lng && (
                  <a
                    href={`https://maps.google.com/?q=${r.user_location_lat},${r.user_location_lng}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      marginBottom: '1rem',
                      border: '1px solid #bfdbfe',
                      color: '#1e40af',
                      fontWeight: 500
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>📍</span>
                    <div>
                      <div>Navigate to caller</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                        {r.user_location_lat.toFixed(6)}, {r.user_location_lng.toFixed(6)}
                      </div>
                    </div>
                  </a>
                )}

                {/* Accept/Reject Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => userId && accept(r.id, userId)}
                    className="btn-accept"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flex: 2,
                      justifyContent: 'center',
                      padding: '1rem',
                      fontSize: '1rem',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>✓</span> Accept Request
                  </button>
                  <button
                    onClick={() => decline(r.id)}
                    className="btn-decline"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '1rem',
                      fontSize: '1rem',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>✗</span> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>🎯 Active Requests ({activeRequests.length})</h2>
        {activeRequests.length === 0 && pendingRequests.length === 0 && (
          <div style={{ background: 'white', padding: '3rem', borderRadius: '16px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💤</div>
            <p style={{ fontWeight: 500 }}>No active requests at the moment</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              {isOnline ? 'Stay online to receive new emergency requests' : 'Go online to start receiving requests'}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {activeRequests.map((r, index) => (
            <div key={r.id} className={`request-card ${r.status}`} style={{
              animationDelay: `${index * 0.1}s`,
              borderLeft: `4px solid ${r.status === 'accepted' ? '#10b981' : r.status === 'en_route' ? '#8b5cf6' : '#3b82f6'}`,
              background: r.status === 'en_route' ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' : 'white'
            }}>
              {/* User Profile Section for Active Requests */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: r.status === 'en_route' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  color: 'white',
                  fontWeight: 700,
                  boxShadow: r.status === 'en_route' ? '0 4px 12px rgba(139, 92, 246, 0.3)' : '0 4px 12px rgba(16, 185, 129, 0.3)',
                  overflow: 'hidden'
                }}>
                  {r.user_profile?.profile_image_url ? (
                    <img src={r.user_profile.profile_image_url} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    r.user_profile?.full_name?.charAt(0)?.toUpperCase() || '👤'
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1.125rem', color: '#111827' }}>
                    {r.user_profile?.full_name || 'Anonymous User'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {r.category?.replace('_', ' ')} • {formatTimeAgo(r.created_at)}
                  </div>
                </div>
                <span className={`status-badge ${r.status}`} style={{
                  background: r.status === 'en_route' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  animation: r.status === 'en_route' ? 'pulse 2s ease-in-out infinite' : 'none'
                }}>
                  {r.status === 'en_route' ? '🚗 En Route' : '✓ Accepted'}
                </span>
              </div>

              {/* Live Map Tracking Section - Only for en_route */}
              {r.status === 'en_route' && r.user_location_lat && r.user_location_lng && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    color: '#7c3aed',
                    fontWeight: 600
                  }}>
                    <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>📍</span>
                    Live Tracking - Heading to User
                  </div>

                  {/* Simulated Live Map */}
                  <div style={{
                    width: '100%',
                    height: '200px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '2px solid #8b5cf6',
                    position: 'relative'
                  }}>
                    <iframe
                      title="Live Tracking Map"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${loc?.lat || 9.0},${loc?.lng || 38.7}&destination=${r.user_location_lat},${r.user_location_lng}&mode=driving`}
                      allowFullScreen
                    />
                    {/* Live indicator overlay */}
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      background: 'rgba(139, 92, 246, 0.95)',
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        animation: 'pulse 1s ease-in-out infinite'
                      }} />
                      LIVE
                    </div>
                  </div>

                  {/* ETA and Distance Info */}
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginTop: '0.75rem',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{
                      flex: 1,
                      background: '#f5f3ff',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      textAlign: 'center',
                      minWidth: '100px'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>ETA</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#7c3aed' }}>
                        {Math.floor(Math.random() * 10 + 3)} min
                      </div>
                    </div>
                    <div style={{
                      flex: 1,
                      background: '#f5f3ff',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      textAlign: 'center',
                      minWidth: '100px'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Distance</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#7c3aed' }}>
                        {(Math.random() * 3 + 0.5).toFixed(1)} km
                      </div>
                    </div>
                    <div style={{
                      flex: 1,
                      background: '#f5f3ff',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      textAlign: 'center',
                      minWidth: '100px'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Speed</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#7c3aed' }}>
                        45 km/h
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Voice Chat Section - Only for en_route */}
              {r.status === 'en_route' && (
                <div style={{
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  border: '1px solid #6ee7b7'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem'
                  }}>
                    <div style={{ fontWeight: 600, color: '#059669', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>🎙️</span> Live Voice Chat
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      background: '#10b981',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '10px'
                    }}>
                      Available
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        alert('🎙️ Voice call initiated! In production, this would connect you with the user via WebRTC.')
                      }}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        minWidth: '120px'
                      }}
                    >
                      <span style={{ fontSize: '1.25rem' }}>📞</span> Start Call
                    </button>
                    <button
                      onClick={() => {
                        alert('💬 Message sent: "I am on my way, please stay safe!"')
                      }}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        border: 'none',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        minWidth: '120px'
                      }}
                    >
                      <span style={{ fontSize: '1.25rem' }}>💬</span> Quick Message
                    </button>
                    {r.user_profile?.phone && (
                      <a
                        href={`tel:${r.user_profile.phone}`}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                          color: 'white',
                          border: 'none',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          textDecoration: 'none'
                        }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>📱</span> Call Phone
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Request Details */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  {r.details || 'No additional details'}
                </div>
              </div>

              {/* Navigation Link */}
              {r.user_location_lat && r.user_location_lng && (
                <a
                  href={`https://maps.google.com/maps?daddr=${r.user_location_lat},${r.user_location_lng}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: r.status === 'en_route' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : '#eff6ff',
                    color: r.status === 'en_route' ? 'white' : '#1e40af',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginBottom: '1rem',
                    textDecoration: 'none'
                  }}
                >
                  🧭 Open in Google Maps Navigation
                </a>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {r.status === 'accepted' && (
                  <button
                    onClick={() => loc && updateStatus(r.id, 'en_route', loc)}
                    className="btn-enroute"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flex: 1,
                      justifyContent: 'center',
                      padding: '1rem',
                      fontSize: '1rem',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>🚗</span> Start En Route & Share Location
                  </button>
                )}
                {r.status === 'en_route' && (
                  <button
                    onClick={() => updateStatus(r.id, 'completed')}
                    className="btn-complete"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flex: 1,
                      justifyContent: 'center',
                      padding: '1rem',
                      fontSize: '1rem',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>✓</span> Mark as Completed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>📋 Work History</h2>
        {history.length === 0 && <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No completed jobs yet.</div>}
        <div className="flex flex-col gap-3">
          {history.slice(0, 5).map((r, index) => (
            <div key={r.id} className="animate-fade-in" style={{ background: '#f9fafb', padding: '1rem', borderRadius: '12px', border: '1px solid #e5e7eb', animationDelay: `${index * 0.1}s` }}>
              <div className="flex justify-between items-center">
                <div>
                  <div style={{ fontWeight: 600 }}>{r.category || 'Emergency'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <span className={`status-badge ${r.status}`} style={{ transform: 'scale(0.9)' }}>{r.status}</span>
              </div>
            </div>
          ))}
        </div>
        {history.length > 5 && (
          <button className="btn-secondary" style={{ width: '100%', marginTop: '1rem' }}>
            View all history ({history.length} total)
          </button>
        )}
      </div>
    </div>
  )
}
