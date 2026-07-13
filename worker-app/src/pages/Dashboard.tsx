import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { supabase } from '../integrations/supabase/client'
import { useEmergencyRequests } from '../hooks/useEmergencyRequests'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import EditProfileModal from '../components/EditProfileModal'
import WorkerEarnings from '../components/WorkerEarnings'
import DemandHeatmap from '../components/DemandHeatmapGoogle'
import WorkerLeaderboard from '../components/WorkerLeaderboard'
import { useTranslation } from '../contexts/LanguageContext'
import { useVoiceCall } from '../hooks/useVoiceCall'
import {
  Bell,
  Map as MapIcon,
  TrendingUp,
  LogOut,
  User,
  Award,
  Navigation,
  AlertTriangle,
  LayoutDashboard,
  ClipboardCheck,
  Wifi,
  WifiOff,
  Gauge,
  MapPin,
  Settings,
  Volume2,
  Phone
} from 'lucide-react'
import { EmergencyRequest } from '../hooks/useEmergencyRequests'

export default function Dashboard() {
  const nav = useNavigate()
  const { t } = useTranslation()
  const [userId, setUserId] = useState<string | null>(null)
  const [userCategory, setUserCategory] = useState<string>('police')
  const [userName, setUserName] = useState<string>('')
  const { requests, history, loading, accept, decline, updateStatus, sendMessage } = useEmergencyRequests()
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [activeTab, setActiveTab] = useState<'requests' | 'revenue' | 'demand'>('requests')
  const [showNotification, setShowNotification] = useState(false)
  const [newRequestCount, setNewRequestCount] = useState(0)
  const prevRequestsRef = useRef<string[]>([])
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null)
  const [ringing, setRinging] = useState(false)
  const ringingRef = useRef(false)

  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const playAlarmSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const playTone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur);
      };
      for (let i = 0; i < 4; i++) {
        playTone(880, i * 0.6, 0.25);
        playTone(660, i * 0.6 + 0.3, 0.25);
      }
    } catch (e) {
      console.warn('Web Audio API not available for alarm');
    }
  }, [getAudioContext]);

  // Pre-create AudioContext on first user interaction (for autoplay policy)
  useEffect(() => {
    const handler = () => { getAudioContext(); document.removeEventListener('pointerdown', handler); document.removeEventListener('keydown', handler); };
    document.addEventListener('pointerdown', handler);
    document.addEventListener('keydown', handler);
    return () => { document.removeEventListener('pointerdown', handler); document.removeEventListener('keydown', handler); };
  }, [getAudioContext]);

  const stopAlarm = () => {
    ringingRef.current = false
    setRinging(false)
  }

  const getGpsQuality = (accuracy: number | null): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' => {
    if (!accuracy) return 'unknown'
    if (accuracy <= 10) return 'excellent'
    if (accuracy <= 25) return 'good'
    if (accuracy <= 50) return 'fair'
    return 'poor'
  }

  const getGpsQualityColor = (quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown') => {
    switch (quality) {
      case 'excellent': return 'text-emerald-600'
      case 'good': return 'text-blue-600'
      case 'fair': return 'text-amber-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getGpsQualityLabel = (quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown') => {
    switch (quality) {
      case 'excellent': return t('Excellent')
      case 'good': return t('Good')
      case 'fair': return t('Fair')
      case 'poor': return t('Poor')
      default: return t('Unknown')
    }
  }

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): string => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distanceKm = R * c
    if (distanceKm < 1) {
      const distanceM = Math.round(distanceKm * 1000)
      return `${distanceM}${t('m away')}`
    }
    return `${distanceKm.toFixed(1)}${t('km away')}`
  }

  const getDistanceFromWorker = (request: EmergencyRequest): string | null => {
    if (!loc || !request.user_location_lat || !request.user_location_lng) return null
    return calculateDistance(loc.lat, loc.lng, request.user_location_lat, request.user_location_lng)
  }

  const gpsQuality = getGpsQuality(gpsAccuracy)

  // UI State
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [cancelledRequest, setCancelledRequest] = useState<EmergencyRequest | null>(null)

  // Check for new requests and play alarm notification
  useEffect(() => {
    const currentIds = requests.filter(r => r.status === 'pending').map(r => r.id)
    const newRequests = currentIds.filter(id => !prevRequestsRef.current.includes(id))

    if (newRequests.length > 0 && prevRequestsRef.current.length > 0) {
      setShowNotification(true)
      setNewRequestCount(newRequests.length)
      if (!ringingRef.current) {
        ringingRef.current = true
        setRinging(true)
        playAlarmSound()
      }
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🚨 New Emergency Request!', {
          body: `You have ${newRequests.length} new emergency request(s)`,
          icon: '🚨'
        })
      }
    }

    // Check if an active request was cancelled
    const activeIds = requests.filter(r => r.status !== 'pending').map(r => r.id)
    prevRequestsRef.current.forEach(id => {
      if (!currentIds.includes(id) && !activeIds.includes(id)) {
        const justCancelled = history.find(h => h.id === id && h.status === 'cancelled')
        if (justCancelled) {
          setCancelledRequest(justCancelled)
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
        setGpsAccuracy(position.coords.accuracy)
        saveLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      (err) => {
        console.warn('ℹ️ Geolocation access restricted. Using default location.');
        setLocationError('Location access denied. Using default location (Addis Ababa).');
        setGpsAccuracy(null)
        if (!loc) {
          setLoc({ lat: 9.0320, lng: 38.7469 });
        }
      },
      { enableHighAccuracy: true, maximumAge: 60000 }
    )

    const heartbeatId = setInterval(() => {
      if (isOnline) {
        const currentLoc = loc || { lat: 9.0320, lng: 38.7469 };
        saveLocation(currentLoc);
      }
    }, 30000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(heartbeatId);
    }
  }, [userId, userCategory, isOnline])

  // Voice call - auto-listen on first active request

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
  const primaryActiveRequest = activeRequests[0];
  const voiceCall = useVoiceCall(
    primaryActiveRequest?.id || 'none',
    userId || '',
    primaryActiveRequest?.user_id || ''
  );

  // En-route location simulation ref
  const enRouteSimRef = useRef<number | null>(null);

  const startEnRouteSim = (requestId: string, targetLat: number, targetLng: number, currentLoc: { lat: number; lng: number }) => {
    if (enRouteSimRef.current) { clearInterval(enRouteSimRef.current); enRouteSimRef.current = null; }
    // If start and target are the same (both default coords), apply a visible offset for demonstration
    const dLat = targetLat - currentLoc.lat;
    const dLng = targetLng - currentLoc.lng;
    let effectiveTarget = { lat: targetLat, lng: targetLng };
    if (Math.abs(dLat) < 0.001 && Math.abs(dLng) < 0.001) {
      effectiveTarget = { lat: currentLoc.lat + 0.02, lng: currentLoc.lng + 0.02 };
      console.log('📍 Using offset target for visual movement:', effectiveTarget);
    }
    console.log('🚗 Starting en-route simulation:', requestId, currentLoc, '->', effectiveTarget);
    let step = 0;
    const totalSteps = 60;
    const simInterval = window.setInterval(() => {
      step++;
      if (step > totalSteps) { clearInterval(simInterval); enRouteSimRef.current = null; console.log('✅ En-route simulation complete'); return; }
      const fraction = Math.min(step / totalSteps, 1);
      const newLat = currentLoc.lat + (effectiveTarget.lat - currentLoc.lat) * fraction;
      const newLng = currentLoc.lng + (effectiveTarget.lng - currentLoc.lng) * fraction;
      void supabase.from('emergency_requests' as any)
        .update({
          responder_location_lat: newLat,
          responder_location_lng: newLng,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .then(() => console.log('📍 Sim update step', step, ':', newLat, newLng));
    }, 2000);
    enRouteSimRef.current = simInterval;
  };

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

  const getPriorityMeta = (request: EmergencyRequest) => {
    const text = `${request.category || ''} ${request.details || ''}`.toLowerCase()
    const emergencyKeywords = ['unconscious', 'bleed', 'fire', 'smoke', 'attack', 'stuck', 'heart', 'urgent', 'child', 'accident']
    const criticalMatch = emergencyKeywords.some(keyword => text.includes(keyword))
    if (criticalMatch || request.category === 'ambulance' || request.category === 'fire_truck') {
      return { label: t('Critical'), className: 'bg-red-100 text-red-700 border-red-200' }
    }
    if (request.category === 'traffic_police' || request.category === 'tow_truck') {
      return { label: t('High'), className: 'bg-amber-100 text-amber-700 border-amber-200' }
    }
    return { label: t('Normal'), className: 'bg-slate-100 text-slate-700 border-slate-200' }
  }

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return t('Just now')
    if (seconds < 3600) return `${Math.floor(seconds / 60)}${t('m ago')}`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}${t('h ago')}`
    return new Date(date).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-8">
          <div className="h-64 rounded-[40px] bg-white shadow-sm" />
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="h-80 rounded-[32px] bg-white" />
            <div className="h-80 rounded-[32px] bg-white lg:col-span-2" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 md:pb-8 overflow-x-hidden">

      {/* Global Notifications Area */}
      {showNotification && (
        <div className="fixed top-20 right-4 z-[100] w-full max-w-sm animate-slide-in-right">
          <div className="glass rounded-3xl p-5 shadow-2xl border-orange-200 bg-white/95 ring-2 ring-orange-500/30">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg animate-bounce">
                <Bell className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black text-gray-900 leading-tight">
                  {newRequestCount > 1 ? t('New Emergencies!') : t('New Emergency!')}
                </h3>
                <p className="mt-1 text-sm font-medium text-gray-600">
                  {newRequestCount} {newRequestCount > 1 ? t('pending requests waiting.') : t('pending request waiting.')}
                </p>
                {ringing && (
                  <div className="mt-2 flex items-center gap-2 text-xs font-black text-orange-600 uppercase tracking-widest">
                    <Volume2 className="h-3 w-3 animate-pulse" />
                    {t('Alarm ringing')}
                  </div>
                )}
              </div>
              <button
                onClick={() => { stopAlarm(); setShowNotification(false); setNewRequestCount(0); }}
                className="shrink-0 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white shadow-lg transition-all hover:bg-black active:scale-95"
              >
                {t('DISMISS')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Wrapper */}
      <div className="mx-auto w-full max-w-[1400px] px-4 pt-6 sm:px-6 lg:px-8">
        
        {/* Responsive Dashboard Header */}
        <div className="relative mb-8 overflow-hidden rounded-[40px] bg-slate-900 p-8 text-white shadow-2xl md:p-12">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-orange-500/20 blur-[80px]" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]" />
          
          <div className="relative z-10 flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
            <div className="flex items-center gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-white/10 text-4xl shadow-2xl backdrop-blur-2xl ring-1 ring-white/20">
                {theme.icon}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{theme.label}</h1>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    {isOnline ? t('Active') : t('Offline')}
                  </span>
                </div>
                <p className="mt-2 text-lg font-medium text-slate-400">{t('Welcome back,')} <span className="text-white">{userName}</span></p>
              </div>
            </div>

                <div className="flex w-full flex-wrap gap-4 md:w-auto">
              <div className="flex flex-1 items-center gap-4 rounded-3xl bg-white/5 p-2 pr-6 backdrop-blur-xl ring-1 ring-white/10">
                <button
                  onClick={() => setShowEditProfile(true)}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 font-black text-white/70 transition-all hover:bg-white/20 hover:text-white"
                  title={t('Edit Profile')}
                >
                  <Settings size={18} />
                  <span className="hidden sm:inline text-xs">{t('PROFILE')}</span>
                </button>
                <button
                  onClick={toggleOnlineStatus}
                  className={`flex h-12 items-center justify-center gap-3 rounded-2xl px-6 font-black transition-all ${
                    isOnline ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  }`}
                >
                  {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
                  {isOnline ? t('GO OFFLINE') : t('GO ONLINE')}
                </button>
                <div className="hidden flex-col md:flex">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('GPS Signal')}</span>
                  <span className={`text-xs font-bold ${getGpsQualityColor(gpsQuality)} bg-transparent p-0`}>
                    {getGpsQualityLabel(gpsQuality)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation - PC Only (Mobile uses floating bottom bar) */}
        <div className="hidden md:flex mb-8 gap-4">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex flex-1 items-center justify-center gap-3 rounded-3xl p-5 transition-all duration-300 ${
              activeTab === 'requests'
                ? 'glass bg-white shadow-xl ring-2 ring-orange-500/20 text-orange-600'
                : 'bg-white/50 text-slate-500 hover:bg-white'
            }`}
          >
            <Bell className={activeTab === 'requests' ? 'animate-bounce' : ''} />
            <span className="text-lg font-black uppercase tracking-tight">{t('Active Jobs')}</span>
            {pendingRequests.length > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-black text-white">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('revenue')}
            className={`flex flex-1 items-center justify-center gap-3 rounded-3xl p-5 transition-all duration-300 ${
              activeTab === 'revenue'
                ? 'glass bg-white shadow-xl ring-2 ring-orange-500/20 text-orange-600'
                : 'bg-white/50 text-slate-500 hover:bg-white'
            }`}
          >
            <TrendingUp />
            <span className="text-lg font-black uppercase tracking-tight">{t('Earnings')}</span>
          </button>
          <button
            onClick={() => setActiveTab('demand')}
            className={`flex flex-1 items-center justify-center gap-3 rounded-3xl p-5 transition-all duration-300 ${
              activeTab === 'demand'
                ? 'glass bg-white shadow-xl ring-2 ring-orange-500/20 text-orange-600'
                : 'bg-white/50 text-slate-500 hover:bg-white'
            }`}
          >
            <MapIcon />
            <span className="text-lg font-black uppercase tracking-tight">{t('Hotspots')}</span>
          </button>
        </div>

        {/* View Content */}
        <div className="animate-slide-up">
          {activeTab === 'requests' && (
            <div className="grid gap-8 lg:grid-cols-[320px_1fr_360px]">
              
              {/* Left Sidebar: Ops Summary */}
              <aside className="space-y-6">
                <div className="glass rounded-[32px] p-6">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                      <LayoutDashboard className="h-5 w-5" />
                    </div>
                    {t('Dispatcher')}
                  </h3>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-[24px] bg-slate-50 p-4 border border-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('Waiting')}</p>
                      <p className="mt-1 text-3xl font-black text-orange-600">{pendingRequests.length}</p>
                    </div>
                    <div className="rounded-[24px] bg-slate-50 p-4 border border-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('Ongoing')}</p>
                      <p className="mt-1 text-3xl font-black text-slate-900">{activeRequests.length}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-[24px] bg-slate-900 p-5 text-white">
                    <div className="flex items-center gap-2 text-orange-400">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('Hot Zone')}</span>
                    </div>
                    <p className="mt-2 text-base font-bold capitalize">{topDemandCategory.replace('_', ' ')}</p>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">{t('System queue is prioritising response in this category.')}</p>
                  </div>
                </div>


              </aside>

              {/* Center: Main Queue */}
              <main className="space-y-8">
                
                {/* Pending Requests Section */}
                <section>
                  <div className="flex items-center justify-between mb-6 px-2">
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                      <Bell className="h-6 w-6 text-orange-500" />
                      {t('Pending Jobs')}
                    </h2>
                    <span className="rounded-full bg-orange-100 px-4 py-1.5 text-xs font-black text-orange-700">
                      {pendingRequests.length} {t('AVAILABLE')}
                    </span>
                  </div>

                  <div className="grid gap-6">
                    {pendingRequests.length === 0 ? (
                      <div className="glass rounded-[40px] border-dashed border-slate-200 bg-white/40 p-16 text-center">
                        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[32px] bg-slate-100 text-slate-400">
                          <Bell className="h-10 w-10" />
                        </div>
                        <h3 className="mt-6 text-2xl font-black text-slate-900">{t('Quiet for now')}</h3>
                        <p className="mt-2 text-slate-500 font-medium">{t('New emergency calls will pop up here instantly.')}</p>
                      </div>
                    ) : (
                      pendingRequests.map((r, index) => {
                        const priority = getPriorityMeta(r)
                        const distance = getDistanceFromWorker(r)
                        const isCritical = priority.label === 'Critical'
                        return (
                          <div
                            key={r.id}
                            className={`request-card rounded-[32px] overflow-hidden bg-white shadow-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] ${
                              isCritical ? 'emergency-pulse ring-2 ring-red-500' : 'border border-slate-100'
                            }`}
                            style={{ animationDelay: `${index * 0.08}s` }}
                          >
                            <div className={`h-2 w-full ${isCritical ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`} />
                            <div className="p-6 md:p-8">
                              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex items-center gap-5">
                                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl font-black text-white shadow-2xl ${
                                    isCritical ? 'bg-gradient-to-br from-red-500 to-red-600 animate-pulse-glow-red' : 'bg-gradient-to-br from-orange-400 to-orange-600'
                                  }`}>
                                    {isCritical ? '🚨' : (r.user_profile?.full_name?.charAt(0).toUpperCase() || 'U')}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="truncate text-xl font-black text-slate-900">{r.user_profile?.full_name || t('Anonymous User')}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                      <span className="text-sm font-bold text-slate-400 flex items-center gap-1.5">
                                        <Navigation className="h-3.5 w-3.5" />
                                        {formatTimeAgo(r.created_at)}
                                      </span>
                                      <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                                      <span className={`text-xs font-black uppercase tracking-widest ${isCritical ? 'text-red-600' : 'text-orange-600'}`}>
                                        {r.category?.replace('_', ' ')}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-[0.15em] shadow-sm ${priority.className}`}>
                                  {priority.label}
                                </div>
                              </div>

                              <div className="mt-6 rounded-3xl bg-slate-50/50 p-6 border border-slate-100">
                                <p className="text-base leading-relaxed text-slate-700 font-medium">
                                  {r.details || t('Emergency assistance requested. Standby for further details upon arrival.')}
                                </p>
                              </div>

                              <div className="mt-6 flex flex-wrap items-center gap-4">
                                {distance && (
                                  <div className="flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 border border-blue-100/50">
                                    <MapPin className="h-4 w-4" />
                                    {distance.toUpperCase()}
                                  </div>
                                )}
                                {r.estimated_price && (
                                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-700 border border-emerald-100/50">
                                    <TrendingUp className="h-4 w-4" />
                                    ETB {r.estimated_price.toLocaleString()}
                                  </div>
                                )}
                              </div>

                              <div className="mt-8 flex items-center gap-4">
                                <button 
                                  onClick={() => userId && accept(r.id, userId)} 
                                  className={`flex-[4] min-h-[70px] rounded-3xl text-xl font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                    isCritical ? 'bg-red-600 text-white shadow-red-200' : 'bg-slate-900 text-white shadow-slate-200'
                                  }`}
                                >
                                  {t('ACCEPT JOB')}
                                </button>
                                <button 
                                  onClick={() => decline(r.id)} 
                                  className="flex-1 min-h-[70px] rounded-3xl bg-slate-100 text-slate-400 font-black hover:bg-slate-200 hover:text-slate-600 transition-all text-sm uppercase tracking-widest"
                                >
                                  {t('SKIP')}
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </section>

                {/* Active Requests Section */}
                <section>
                  <div className="flex items-center justify-between mb-6 px-2">
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                      <ClipboardCheck className="h-6 w-6 text-emerald-500" />
                      {t('Ongoing Assignments')}
                    </h2>
                    <span className="rounded-full bg-slate-900 px-4 py-1.5 text-[10px] font-black text-white uppercase tracking-widest">
                      {activeRequests.length} {t('IN PROGRESS')}
                    </span>
                  </div>

                  <div className="grid gap-6">
                    {activeRequests.length === 0 ? (
                      <div className="glass rounded-[40px] border-dashed border-slate-200 bg-white/40 p-12 text-center">
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('No active assignments')}</p>
                      </div>
                    ) : (
                      activeRequests.map((r, index) => {
                        const priority = getPriorityMeta(r)
                        const isCritical = priority.label === 'Critical'
                        return (
                          <div
                            key={r.id}
                            className={`request-card rounded-[32px] overflow-hidden bg-white shadow-xl transition-all border border-slate-100 ${r.status}`}
                            style={{ animationDelay: `${index * 0.08}s` }}
                          >
                            <div className={`h-2 w-full ${isCritical ? 'bg-red-500' : 'bg-emerald-500'}`} />
                            <div className="p-6 md:p-8">
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <h4 className="text-xl font-black text-slate-900">{r.user_profile?.full_name || 'Anonymous User'}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-black text-orange-600 uppercase tracking-widest">{r.category?.replace('_', ' ')}</span>
                                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                                    <span className="text-xs font-bold text-slate-400">{formatTimeAgo(r.created_at)}</span>
                                    {primaryActiveRequest?.id === r.id && voiceCall.callStatus === 'connected' && (
                                      <span className="flex items-center gap-1 text-[10px] font-black text-green-600 uppercase tracking-wider bg-green-50 px-2 py-0.5 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        Live Call
                                      </span>
                                    )}
                                    {voiceCall.error && primaryActiveRequest?.id === r.id && (
                                      <span className="text-[10px] text-red-500 ml-2">{voiceCall.error}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`status-badge ${r.status}`}>{r.status.replace('_', ' ')}</span>
                                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm ${priority.className}`}>
                                    {priority.label}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                {r.status === 'accepted' && (
                                  <button 
                                    onClick={() => {
                                      if (loc && r.user_location_lat && r.user_location_lng) {
                                        updateStatus(r.id, 'en_route', loc);
                                        startEnRouteSim(r.id, r.user_location_lat, r.user_location_lng, loc);
                                      } else if (loc) {
                                        updateStatus(r.id, 'en_route', loc);
                                      }
                                    }}
                                    className="min-h-[64px] flex-[2] rounded-[24px] bg-indigo-600 text-white text-base font-black shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                  >
                                    {t('EN ROUTE')}
                                  </button>
                                )}
                                {primaryActiveRequest?.id === r.id && voiceCall.callStatus === 'connected' && (
                                  <button
                                    onClick={() => voiceCall.endCall()}
                                    className="min-h-[64px] flex-1 rounded-[24px] bg-green-600 text-white font-black shadow-xl shadow-green-100 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                  >
                                    <Phone className="h-5 w-5" /> {t('End Call')}
                                  </button>
                                )}
                                <button 
                                  onClick={() => updateStatus(r.id, 'completed')} 
                                  className="min-h-[64px] flex-[2] rounded-[24px] bg-emerald-600 text-white text-base font-black shadow-xl shadow-emerald-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                  {t('MARK COMPLETED')}
                                </button>
                                <button
                                  onClick={() => {
                                    if (primaryActiveRequest?.id === r.id && voiceCall.callStatus !== 'idle') {
                                      voiceCall.endCall();
                                    }
                                    updateStatus(r.id, 'cancelled');
                                  }}
                                  className="min-h-[64px] flex-1 rounded-[24px] bg-slate-100 text-slate-400 font-black hover:bg-rose-50 hover:text-rose-600 transition-all text-xs"
                                >
                                  {t('CANCEL')}
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </section>
              </main>

              {/* Right Sidebar: Intel & History */}
              <aside className="space-y-6">
                <div className="glass rounded-[32px] p-6">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                      <Award className="h-5 w-5" />
                    </div>
                    {t('Performance')}
                  </h3>
                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex-1 rounded-[24px] bg-slate-900 p-5 text-white">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('Monthly Jobs')}</p>
                      <p className="mt-1 text-4xl font-black leading-none">{completedCount}</p>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="text-center">
                        <p className="text-xs font-black text-slate-900">4.9 ★</p>
                        <p className="text-[10px] font-bold text-slate-400">{t('Rating')}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black text-slate-900">100%</p>
                        <p className="text-[10px] font-bold text-slate-400">{t('Success')}</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setShowHistoryModal(true)} className="mt-6 w-full rounded-2xl bg-slate-100 py-4 text-xs font-black text-slate-600 uppercase tracking-widest transition-all hover:bg-slate-200">
                    {t('Full Operations Log')}
                  </button>
                </div>

                <div className="glass rounded-[32px] p-6">
                  <h3 className="text-base font-black text-slate-900 mb-6">{t('Recent Log')}</h3>
                  <div className="space-y-4">
                    {recentHistory.length === 0 ? (
                      <p className="text-sm font-bold text-slate-400 text-center py-8">{t('No recent activity.')}</p>
                    ) : (
                      recentHistory.map((r) => (
                        <div key={r.id} className="relative pl-6 before:absolute before:left-0 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-slate-200">
                          <p className="text-sm font-black text-slate-900">{r.category?.replace('_', ' ')}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">{new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="glass rounded-[32px] p-8 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-none shadow-indigo-200">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 mb-6 ring-1 ring-white/20">
                    <Gauge className="h-6 w-6" />
                  </div>
                  <h4 className="text-xl font-black leading-tight">{t('Response Intelligence')}</h4>
                  <p className="mt-3 text-sm font-medium text-indigo-100 leading-relaxed">
                    {t('System suggests positioning near')} <span className="text-white font-bold">{topDemandCategory.replace('_', ' ')}</span> {t('hotspots for faster dispatch.')}
                  </p>
                </div>

                <WorkerLeaderboard />
              </aside>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="animate-slide-up">
              <WorkerEarnings userId={userId} />
            </div>
          )}

          {activeTab === 'demand' && (
            <div className="animate-slide-up">
              <DemandHeatmap />
            </div>
          )}
        </div>
      </div>

      {/* Modern Mobile Bottom Navigation */}
      <div className="fixed inset-x-4 bottom-6 z-50 md:hidden">
        <div className="flex items-center justify-around gap-1 rounded-[32px] bg-slate-900/95 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl border border-white/10">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-[24px] py-3 transition-all duration-300 ${
              activeTab === 'requests' ? 'bg-orange-500 text-white' : 'text-slate-400'
            }`}
          >
            <div className="relative">
              <Bell size={20} />
              {pendingRequests.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-2 ring-slate-900">
                  {pendingRequests.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{t('Jobs')}</span>
          </button>

          <button
            onClick={() => setActiveTab('revenue')}
            className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-[24px] py-3 transition-all duration-300 ${
              activeTab === 'revenue' ? 'bg-orange-500 text-white' : 'text-slate-400'
            }`}
          >
            <TrendingUp size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">{t('Cash')}</span>
          </button>

          <button
            onClick={() => setActiveTab('demand')}
            className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-[24px] py-3 transition-all duration-300 ${
              activeTab === 'demand' ? 'bg-orange-500 text-white' : 'text-slate-400'
            }`}
          >
            <MapIcon size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">{t('Map')}</span>
          </button>

          <button
            onClick={toggleOnlineStatus}
            className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-[24px] py-3 transition-all duration-300 ${
              isOnline ? 'text-emerald-400' : 'text-rose-400 bg-rose-500/10'
            }`}
          >
            <div className={`flex h-6 w-6 items-center justify-center rounded-full ${isOnline ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
              <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{isOnline ? t('Live') : t('Off')}</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title={t('Operations Log')}>
        <div className="flex flex-col gap-4 p-2">
          {history.length === 0 ? (
            <p className="text-center text-slate-400 font-bold py-12">{t('NO PREVIOUS LOGS FOUND')}</p>
          ) : (
            history.map(r => (
              <div key={r.id} className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-lg font-black text-slate-900">{r.category?.replace('_', ' ')}</span>
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">{r.details || t('No additional field logs recorded for this event.')}</p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('Mission Successful')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {cancelledRequest && (
        <Modal isOpen={true} onClose={() => setCancelledRequest(null)} title={t('⚠️ MISSION CANCELLED')}>
          <div className="text-center p-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-rose-50 text-rose-500 mb-6 ring-1 ring-rose-100">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">{t('Request Aborted')}</h3>
            <p className="text-slate-500 mb-8 font-medium">{t('The user has terminated the emergency request. No further action is required for this mission.')}</p>
            <button onClick={() => setCancelledRequest(null)} className="w-full py-5 bg-slate-900 text-white rounded-3xl text-lg font-black shadow-2xl transition-all active:scale-95">{t('ACKNOWLEDGE')}</button>
          </div>
        </Modal>
      )}

      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        userId={userId || ''}
        currentName={userName}
        currentCategory={userCategory}
        onSaved={() => {
          // Refresh user data
          supabase.auth.getUser().then(({ data }) => {
            const user = data.user
            if (user) {
              setUserName(user.user_metadata.full_name || 'Worker')
              setUserCategory(user.user_metadata.category || 'police')
            }
          })
        }}
      />

      {/* Incoming Call Notification */}
      {voiceCall.incomingCall && primaryActiveRequest && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm animate-in zoom-in-95 duration-300">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-green-400">
              <div className="bg-gradient-to-b from-emerald-500 to-green-600 p-8 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/30 animate-pulse">
                  <Phone className="h-10 w-10 text-white" />
                </div>
                <h2 className="mt-6 text-2xl font-black text-white">Incoming Call</h2>
                <p className="mt-1 text-green-100 font-medium">{primaryActiveRequest.user_profile?.full_name || 'Emergency User'}</p>
                <p className="text-green-200 text-sm">{primaryActiveRequest.category?.replace('_', ' ')} emergency</p>
              </div>
              <div className="flex gap-4 p-6">
                <button
                  onClick={() => voiceCall.declineCall()}
                  className="flex-1 min-h-[56px] rounded-2xl bg-red-500 text-white font-black text-base hover:bg-red-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Phone className="h-5 w-5 rotate-135" /> Decline
                </button>
                <button
                  onClick={() => voiceCall.acceptCall()}
                  className="flex-1 min-h-[56px] rounded-2xl bg-emerald-500 text-white font-black text-base hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                >
                  <Phone className="h-5 w-5" /> Accept
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
