import React, { useEffect, useMemo, useState, useRef } from 'react'
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
  LogOut, 
  User, 
  Award,
  Navigation,
  Copy,
  AlertTriangle,
  ClipboardList,
  LayoutDashboard,
  ClipboardCheck,
  CircleDot
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
  const copyTimerRef = useRef<number | null>(null)
  const [copiedReplyKey, setCopiedReplyKey] = useState<string | null>(null)

  // UI State
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
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
      (err) => { 
        console.warn('ℹ️ Geolocation access restricted. Using default location.');
        setLocationError('Location access denied. Using default location (Addis Ababa).');
        // If GPS is denied, we still want to show as Online
        if (!loc) {
          setLoc({ lat: 9.0320, lng: 38.7469 }); // Addis Ababa fallback
        }
      },
      { enableHighAccuracy: true, maximumAge: 60000 }
    )

    // Heartbeat to keep status "Online" in real-time even if standing still or GPS denied
    const heartbeatId = setInterval(() => {
      if (isOnline) {
        const currentLoc = loc || { lat: 9.0320, lng: 38.7469 };
        console.log('💓 Sending heartbeat status update...');
        saveLocation(currentLoc);
      }
    }, 30000); // Every 30 seconds for faster updates during testing

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(heartbeatId);
    }
  }, [userId, userCategory, isOnline, loc])

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
  const recentHistory = history.slice(0, 3)
  const completedCount = history.filter(h => h.status === 'completed').length
  const topDemandCategory = useMemo(() => {
    const counts = new Map<string, number>()
    const allRequests = pendingRequests.concat(activeRequests, history)
    allRequests.forEach((request) => {
      const key = request.category || 'general'
      counts.set(key, (counts.get(key) || 0) + 1)
    })

    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    return top ? top[0].replace('_', ' ') : 'No demand data yet'
  }, [pendingRequests, activeRequests, history])
  const quickReplies = [
    'I am on the way. Please stay in a safe place.',
    'Please share a landmark or exact pin so I can reach you faster.',
    'I am close. Keep your phone available for updates.'
  ]

  const copyQuickReply = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedReplyKey(key)
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current)
      }
      copyTimerRef.current = window.setTimeout(() => setCopiedReplyKey(null), 1800)
    } catch (error) {
      console.error('Unable to copy quick reply:', error)
    }
  }

  const getPriorityMeta = (request: EmergencyRequest) => {
    const text = `${request.category || ''} ${request.details || ''}`.toLowerCase()
    const emergencyKeywords = ['unconscious', 'bleed', 'fire', 'smoke', 'attack', 'stuck', 'heart', 'urgent', 'child', 'accident']
    const criticalMatch = emergencyKeywords.some(keyword => text.includes(keyword))

    if (criticalMatch || request.category === 'ambulance' || request.category === 'fire_truck') {
      return { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-200' }
    }

    if (request.category === 'traffic_police' || request.category === 'tow_truck') {
      return { label: 'High', className: 'bg-amber-100 text-amber-700 border-amber-200' }
    }

    return { label: 'Normal', className: 'bg-slate-100 text-slate-700 border-slate-200' }
  }

  const getQuickReplyByRequest = (request: EmergencyRequest) => {
    if (request.status === 'accepted' || request.status === 'en_route') {
      return quickReplies
    }
    return []
  }

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return new Date(date).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="dashboard-page container" style={{ paddingTop: '1rem', paddingBottom: '6rem', minHeight: '100vh' }}>
        <div className="animate-pulse space-y-6">
          <div className="h-40 rounded-[28px] bg-white/80 shadow-sm" />
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-12">
            <div className="xl:col-span-3 space-y-4">
              <div className="h-40 rounded-3xl bg-white/70" />
              <div className="h-28 rounded-3xl bg-white/70" />
            </div>
            <div className="xl:col-span-6 space-y-4">
              <div className="h-24 rounded-3xl bg-white/80" />
              <div className="h-36 rounded-3xl bg-white/80" />
              <div className="h-36 rounded-3xl bg-white/80" />
            </div>
            <div className="xl:col-span-3 space-y-4">
              <div className="h-40 rounded-3xl bg-white/70" />
              <div className="h-40 rounded-3xl bg-white/70" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page container" style={{ paddingTop: '1rem', paddingBottom: '6rem' }}>
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
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white/20 text-4xl shadow-lg backdrop-blur-md">
              {theme.icon}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{theme.label} Dashboard</h1>
              <p className="mt-1 text-sm text-white/90">Welcome back, {userName}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  <CircleDot className="h-3.5 w-3.5" />
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  <Bell className="h-3.5 w-3.5" />
                  {pendingRequests.length} pending
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  {completedCount} completed
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={toggleOnlineStatus}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-lg transition-all ${
                isOnline ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-rose-500 text-white hover:bg-rose-600'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              {isOnline ? 'Online' : 'Offline'}
            </button>
            <button
              className="btn-signout inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold"
              onClick={async () => { await supabase.auth.signOut(); nav('/login') }}
              style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)' }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="hidden md:flex bg-white/65 backdrop-blur-xl p-2 rounded-3xl mb-8 shadow-sm border border-white/40 sticky top-4 z-20 gap-2">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all duration-300 ${
            activeTab === 'requests'
              ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg'
              : 'text-gray-600 hover:bg-white'
          }`}
        >
          <Bell size={18} />
          <span className="font-bold">Requests</span>
          {pendingRequests.length > 0 && (
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-black">
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('revenue')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all duration-300 ${
            activeTab === 'revenue'
              ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg'
              : 'text-gray-600 hover:bg-white'
          }`}
        >
          <TrendingUp size={18} />
          <span className="font-bold">Earnings</span>
        </button>
        <button
          onClick={() => setActiveTab('demand')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all duration-300 ${
            activeTab === 'demand'
              ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg'
              : 'text-gray-600 hover:bg-white'
          }`}
        >
          <MapIcon size={18} />
          <span className="font-bold">Hotspots</span>
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/60 bg-white/90 backdrop-blur-xl shadow-[0_-10px_40px_rgba(15,23,42,0.12)] md:hidden">
        <div className="grid grid-cols-3 gap-1 px-3 py-3">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs font-bold transition-all ${
              activeTab === 'requests' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-600'
            }`}
          >
            <Bell size={18} />
            Requests
          </button>
          <button
            onClick={() => setActiveTab('revenue')}
            className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs font-bold transition-all ${
              activeTab === 'revenue' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-600'
            }`}
          >
            <TrendingUp size={18} />
            Earnings
          </button>
          <button
            onClick={() => setActiveTab('demand')}
            className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs font-bold transition-all ${
              activeTab === 'demand' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-600'
            }`}
          >
            <MapIcon size={18} />
            Hotspots
          </button>
        </div>
      </div>

      {activeTab === 'requests' && (
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <aside className="space-y-6 xl:sticky xl:top-24 self-start">
            <div className="glass rounded-[28px] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Dispatch status</p>
                  <h3 className="text-lg font-black text-gray-900">{isOnline ? 'Ready to respond' : 'Paused'}</h3>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/70 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Pending</p>
                  <p className="mt-1 text-2xl font-black text-orange-600">{pendingRequests.length}</p>
                </div>
                <div className="rounded-2xl bg-white/70 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Active</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{activeRequests.length}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-900 p-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Top demand</p>
                <p className="mt-2 text-sm font-bold">{topDemandCategory}</p>
                <p className="mt-1 text-xs text-white/70">The queue is sorted by live responder demand.</p>
              </div>
            </div>

            <div className="glass rounded-[28px] p-5">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-orange-600" />
                <h3 className="text-base font-black text-gray-900">Quick replies</h3>
              </div>
              <p className="mt-2 text-sm text-gray-500">Tap to copy a canned update for the user.</p>
              <div className="mt-4 space-y-2">
                {quickReplies.map((reply, index) => (
                  <button
                    key={reply}
                    onClick={() => copyQuickReply(reply, `quick-${index}`)}
                    className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50"
                  >
                    <span className="pr-3">{reply}</span>
                    <Copy className="h-4 w-4 shrink-0 text-gray-400" />
                  </button>
                ))}
              </div>
              {copiedReplyKey && (
                <p className="mt-3 text-xs font-semibold text-emerald-600">Copied to clipboard.</p>
              )}
            </div>

            <div className="glass rounded-[28px] p-5">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-500" />
                <h3 className="text-base font-black text-gray-900">Performance</h3>
              </div>
              <div className="mt-4 rounded-2xl bg-white/75 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Completed jobs</p>
                <p className="mt-1 text-3xl font-black text-emerald-600">{completedCount}</p>
              </div>
              <button onClick={() => setShowHistoryModal(true)} className="mt-4 w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-black">
                View full history
              </button>
            </div>
          </aside>

          <section className="space-y-6">
            {locationError && (
              <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Location access restricted</p>
                  <p className="text-xs text-amber-700">Using the default map location. Enable GPS for better accuracy.</p>
                </div>
              </div>
            )}

            <div className="glass rounded-[28px] p-5 md:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <Bell className="h-5 w-5 text-orange-600" />
                    Pending Requests
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">Respond to the newest emergencies first.</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">
                  <CircleDot className="h-3.5 w-3.5" />
                  {pendingRequests.length} waiting
                </span>
              </div>

              <div className="mt-5">
                {pendingRequests.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-gray-200 bg-white/70 p-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-black text-gray-900">No pending requests</h3>
                    <p className="mt-2 text-sm text-gray-500">Stay online and the next emergency will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map((r, index) => {
                      const priority = getPriorityMeta(r)
                      return (
                        <div
                          key={r.id}
                          className="request-card rounded-[24px] bg-white p-4 md:p-5"
                          style={{ animationDelay: `${index * 0.08}s`, borderLeft: `6px solid ${theme.color}` }}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 font-black">
                                  {r.user_profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="truncate font-black text-gray-900">{r.user_profile?.full_name || 'Anonymous'}</h4>
                                  <p className="text-xs text-gray-500">{formatTimeAgo(r.created_at)}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`status-badge ${r.status}`}>{r.status}</span>
                              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${priority.className}`}>
                                {priority.label}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-gray-700">{r.category?.replace('_', ' ') || 'General emergency'}</p>
                              <p className="text-sm leading-6 text-gray-600">{r.details || 'No details provided'}</p>
                              {r.estimated_price && (
                                <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                  Estimated price: ETB {r.estimated_price.toLocaleString()}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 md:flex-col">
                              <button onClick={() => userId && accept(r.id, userId)} className="btn-accept min-h-11 flex-1 rounded-2xl px-4 text-sm font-bold">
                                Accept
                              </button>
                              <button onClick={() => decline(r.id)} className="btn-decline min-h-11 rounded-2xl px-4 text-sm font-bold md:w-full">
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="glass rounded-[28px] p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                    Active Requests
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">Keep the user updated while you move.</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                  {activeRequests.length} active
                </span>
              </div>

              <div className="mt-5">
                {activeRequests.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-gray-200 bg-white/70 p-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                      <ClipboardCheck className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-black text-gray-900">No active assignments</h3>
                    <p className="mt-2 text-sm text-gray-500">Accepted requests will appear here with update actions.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeRequests.map((r, index) => {
                      const priority = getPriorityMeta(r)
                      const replies = getQuickReplyByRequest(r)
                      return (
                        <div
                          key={r.id}
                          className={`request-card rounded-[24px] bg-white p-4 md:p-5 ${r.status}`}
                          style={{ animationDelay: `${index * 0.08}s`, borderLeft: `6px solid ${theme.color}` }}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="font-black text-gray-900">{r.user_profile?.full_name || 'Anonymous'}</h4>
                              <p className="mt-1 text-xs text-gray-500">{r.category?.replace('_', ' ') || 'General emergency'} • {formatTimeAgo(r.created_at)}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`status-badge ${r.status}`}>{r.status}</span>
                              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${priority.className}`}>
                                {priority.label}
                              </span>
                            </div>
                          </div>

                          <p className="mt-4 text-sm leading-6 text-gray-600">{r.details || 'No details provided'}</p>
                          {r.estimated_price && (
                            <div className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                              Estimated price: ETB {r.estimated_price.toLocaleString()}
                            </div>
                          )}

                          {replies.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {replies.map((reply, replyIndex) => (
                                <button
                                  key={reply}
                                  onClick={() => copyQuickReply(reply, `${r.id}-${replyIndex}`)}
                                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-orange-200 hover:text-orange-700"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  Copy reply
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="mt-4 flex gap-2">
                            {r.status === 'accepted' && (
                              <button onClick={() => loc && updateStatus(r.id, 'en_route', loc)} className="btn-enroute min-h-11 flex-1 rounded-2xl px-4 text-sm font-bold">
                                En Route
                              </button>
                            )}
                            <button onClick={() => updateStatus(r.id, 'completed')} className="btn-complete min-h-11 flex-1 rounded-2xl px-4 text-sm font-bold">
                              Complete
                            </button>
                            <button
                              onClick={() => updateStatus(r.id, 'cancelled')}
                              className="min-h-11 rounded-2xl bg-red-100 px-4 text-sm font-bold text-red-600 transition-colors hover:bg-red-200"
                              title="Cancel Request"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-6 xl:sticky xl:top-24 self-start">
            <div className="glass rounded-[28px] p-5">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-500" />
                <h3 className="text-base font-black text-gray-900">Dispatch summary</h3>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/75 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Completed</p>
                  <p className="mt-1 text-2xl font-black text-emerald-600">{completedCount}</p>
                </div>
                <div className="rounded-2xl bg-white/75 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Location</p>
                  <p className="mt-1 text-sm font-black text-gray-900">{loc && !locationError ? 'Active' : 'Check GPS'}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-orange-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Current focus</p>
                <p className="mt-2 text-sm font-semibold text-gray-800">Respond to {pendingRequests.length > 0 ? 'the oldest emergency first' : 'new requests as they arrive'}.</p>
              </div>
            </div>

            <div className="glass rounded-[28px] p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-black text-gray-900">Recent history</h3>
                <button onClick={() => setShowHistoryModal(true)} className="text-xs font-bold text-orange-600 hover:text-orange-700">
                  View all
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {recentHistory.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 p-6 text-center text-sm text-gray-400">
                    No completed jobs yet.
                  </div>
                ) : (
                  recentHistory.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-gray-100 bg-white/80 p-4">
                      <p className="font-bold text-gray-900">{r.category?.replace('_', ' ')}</p>
                      <p className="mt-1 text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</p>
                      <p className="mt-2 text-sm text-gray-600">{r.details || 'No details provided'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass rounded-[28px] p-5">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-blue-600" />
                <h3 className="text-base font-black text-gray-900">What is next?</h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-gray-600">
                <li className="flex gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-orange-500" />Accepted jobs will appear with status actions.</li>
                <li className="flex gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />Use quick replies to update the user faster.</li>
                <li className="flex gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />Desktop keeps the queue, history, and ops summary visible together.</li>
              </ul>
            </div>
          </aside>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <aside className="space-y-6 xl:sticky xl:top-24 self-start">
            <div className="glass rounded-[28px] p-5">
              <h3 className="text-base font-black text-gray-900">Earnings snapshot</h3>
              <p className="mt-2 text-sm text-gray-500">Your revenue view is now part of the same dispatch workspace.</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/75 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Current status</p>
                  <p className="mt-1 text-sm font-black text-gray-900">{isOnline ? 'Available' : 'Paused'}</p>
                </div>
                <div className="rounded-2xl bg-white/75 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Completed</p>
                  <p className="mt-1 text-2xl font-black text-emerald-600">{completedCount}</p>
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <WorkerEarnings userId={userId} />
          </main>

          <aside className="space-y-6 xl:sticky xl:top-24 self-start">
            <div className="glass rounded-[28px] p-5">
              <h3 className="text-base font-black text-gray-900">Recent history</h3>
              <div className="mt-4 space-y-3">
                {recentHistory.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 p-6 text-center text-sm text-gray-400">
                    No jobs completed yet.
                  </div>
                ) : (
                  recentHistory.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-gray-100 bg-white/80 p-4">
                      <p className="font-bold text-gray-900">{r.category?.replace('_', ' ')}</p>
                      <p className="mt-1 text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {activeTab === 'demand' && (
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <aside className="space-y-6 xl:sticky xl:top-24 self-start">
            <div className="glass rounded-[28px] p-5">
              <h3 className="text-base font-black text-gray-900">Hotspot summary</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/75 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Active queue</p>
                  <p className="mt-1 text-2xl font-black text-orange-600">{pendingRequests.length + activeRequests.length}</p>
                </div>
                <div className="rounded-2xl bg-white/75 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Top area</p>
                  <p className="mt-1 text-sm font-black text-gray-900 capitalize">{topDemandCategory}</p>
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <DemandHeatmap />
          </main>

          <aside className="space-y-6 xl:sticky xl:top-24 self-start">
            <div className="glass rounded-[28px] p-5">
              <h3 className="text-base font-black text-gray-900">Recent history</h3>
              <div className="mt-4 space-y-3">
                {recentHistory.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 p-6 text-center text-sm text-gray-400">
                    No demand data yet.
                  </div>
                ) : (
                  recentHistory.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-gray-100 bg-white/80 p-4">
                      <p className="font-bold text-gray-900">{r.category?.replace('_', ' ')}</p>
                      <p className="mt-1 text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
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
