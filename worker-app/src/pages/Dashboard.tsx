import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../integrations/supabase/client'
import { useEmergencyRequests } from '../hooks/useEmergencyRequests'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import WorkerEarnings from '../components/WorkerEarnings'
import DemandHeatmap from '../components/DemandHeatmap'
import { 
  Bell, 
  Map as MapIcon, 
  TrendingUp, 
  Settings, 
  LogOut, 
  CheckCircle, 
  Clock, 
  User, 
  Award,
  Navigation,
  Activity
} from 'lucide-react'
import { EmergencyRequest } from '../hooks/useEmergencyRequests'

export default function Dashboard() {
  const nav = useNavigate()
  const [userId, setUserId] = useState<string | null>(null)
  const [userCategory, setUserCategory] = useState<string>('police')
  const [userName, setUserName] = useState<string>('')
  const { requests, history, loading, accept, decline, updateStatus } = useEmergencyRequests()
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [activeTab, setActiveTab] = useState<'requests' | 'revenue' | 'demand'>('requests')
  const [showNotification, setShowNotification] = useState(false)
  const [newRequestCount, setNewRequestCount] = useState(0)
  const prevRequestsRef = useRef<string[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // UI State
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null)
  const [cancelledRequest, setCancelledRequest] = useState<EmergencyRequest | null>(null)

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

    // Check if an active request was cancelled
    const activeIds = requests.filter(r => r.status !== 'pending').map(r => r.id)
    prevRequestsRef.current.forEach(id => {
      if (!currentIds.includes(id) && !activeIds.includes(id)) {
        const justCancelled = history.find(h => h.id === id && h.status === 'cancelled')
        if (justCancelled) {
          setCancelledRequest(justCancelled)
          if (audioRef.current) {
            audioRef.current.play().catch(() => { })
          }
        }
      }
    })

    prevRequestsRef.current = [...currentIds, ...activeIds]
  }, [requests, history])

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

  useEffect(() => {
    if (!navigator.geolocation) return
    if (!userId) return

    const saveLocation = async (newLoc: { lat: number; lng: number }) => {
      setLoc(newLoc)
      try {
        await supabase
          .from('worker_locations' as any)
          .upsert({
            worker_id: userId,
            category: userCategory,
            location_lat: newLoc.lat,
            location_lng: newLoc.lng,
            is_available: isOnline,
            last_updated: new Date().toISOString()
          }, { onConflict: 'worker_id' })
      } catch (err) {
        console.error('Error saving location:', err)
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
      await supabase
        .from('worker_locations' as any)
        .upsert({
          worker_id: userId,
          category: userCategory,
          location_lat: loc.lat,
          location_lng: loc.lng,
          is_available: newStatus,
          last_updated: new Date().toISOString()
        }, { onConflict: 'worker_id' })
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
  const activeRequests = requests.filter(r => r.status !== 'pending' && r.status !== 'completed' && r.status !== 'cancelled')

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
    <div className="container" style={{ paddingTop: '1rem', paddingBottom: '6rem' }}>
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

      {/* Tabs Navigation */}
      <div className="flex bg-white/50 backdrop-blur-md p-1 rounded-2xl mb-8 shadow-sm border border-white/20 sticky top-4 z-20">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 ${
            activeTab === 'requests' 
              ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg' 
              : 'text-gray-500 hover:bg-white/50'
          }`}
        >
          <Bell size={18} />
          <span className="font-bold">Requests</span>
          {pendingRequests.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-bounce ml-2">
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('revenue')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 ${
            activeTab === 'revenue' 
              ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg' 
              : 'text-gray-500 hover:bg-white/50'
          }`}
        >
          <TrendingUp size={18} />
          <span className="font-bold">Earnings</span>
        </button>
        <button
          onClick={() => setActiveTab('demand')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 ${
            activeTab === 'demand' 
              ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg' 
              : 'text-gray-500 hover:bg-white/50'
          }`}
        >
          <MapIcon size={18} />
          <span className="font-bold">Hotspots</span>
        </button>
      </div>

      {activeTab === 'requests' && (
        <>
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
          
          <div className="glass p-6 rounded-2xl mb-8 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Award className="text-yellow-500" />
                Achievement Progress
              </h3>
              <span className="text-sm font-bold text-yellow-600">Level 5 Worker</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-yellow-500 h-2 rounded-full w-[65%]"></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">12 more jobs to become a "Top Rated Pro"</p>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ animation: 'pulse 2s ease-in-out infinite' }}>🔴</span>
              Pending Requests ({pendingRequests.length})
            </h2>

            {pendingRequests.length === 0 && (
              <div className="bg-white/50 backdrop-blur-sm p-8 rounded-2xl border border-dashed border-gray-300 text-center text-gray-400">
                No pending emergency requests.
              </div>
            )}

            {pendingRequests.length > 0 && (
              <div className="flex flex-col gap-3">
                {pendingRequests.map((r, index) => (
                  <div key={r.id} className="request-card pending" style={{ animationDelay: `${index * 0.1}s`, borderLeft: `6px solid ${theme.color}` }}>
                    <div className="flex items-center gap-4 mb-4 pb-4 border-bottom border-gray-100">
                      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xl font-bold">
                        {r.user_profile?.full_name?.charAt(0).toUpperCase() || '👤'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">{r.user_profile?.full_name || 'Anonymous'}</h4>
                        <p className="text-xs text-gray-500">{formatTimeAgo(r.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => userId && accept(r.id, userId)} className="btn-accept flex-1">ACCEPT</button>
                      <button onClick={() => decline(r.id)} className="btn-decline p-3">✗</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>🎯 Active Requests ({activeRequests.length})</h2>
            <div className="flex flex-col gap-3">
              {activeRequests.map((r, index) => (
                <div key={r.id} className={`request-card ${r.status}`} style={{ animationDelay: `${index * 0.1}s`, borderLeft: `4px solid ${theme.color}` }}>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-800">{r.user_profile?.full_name || 'Anonymous'}</h4>
                    <span className="status-badge">{r.status}</span>
                  </div>
                  <div className="flex gap-2">
                    {r.status === 'accepted' && (
                      <button onClick={() => loc && updateStatus(r.id, 'en_route', loc)} className="btn-enroute flex-1">En Route</button>
                    )}
                    <button onClick={() => updateStatus(r.id, 'completed')} className="btn-complete flex-1">Complete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>📋 Recent History</h2>
            <div className="flex flex-col gap-3">
              {history.slice(0, 3).map((r, index) => (
                <div key={r.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-bold text-gray-800">{r.category?.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-green-600 font-bold">Completed</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowHistoryModal(true)} className="w-full mt-4 py-3 bg-gray-100 rounded-xl text-gray-600 font-bold">View Full History</button>
          </div>
        </>
      )}

      {activeTab === 'revenue' && (
        <div className="animate-fade-in-up">
          <WorkerEarnings userId={userId} />
        </div>
      )}

      {activeTab === 'demand' && (
        <div className="animate-fade-in-up">
          <DemandHeatmap />
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Work History">
        <div className="flex flex-col gap-3 p-2">
          {history.length === 0 ? <p className="text-center text-gray-400">No jobs completed yet.</p> : history.map(r => (
            <div key={r.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex justify-between font-bold">
                <span>{r.category?.replace('_', ' ')}</span>
                <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{r.details || 'No details provided'}</p>
            </div>
          ))}
        </div>
      </Modal>

      {cancelledRequest && (
        <Modal isOpen={true} onClose={() => setCancelledRequest(null)} title="⚠️ Cancelled">
          <div className="text-center p-6">
            <div className="text-5xl mb-4">🛑</div>
            <h3 className="text-xl font-bold mb-2">Request Cancelled</h3>
            <p className="text-gray-600 mb-6 font-medium">The user has cancelled the request.</p>
            <button onClick={() => setCancelledRequest(null)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-xl">Acknowledge</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
