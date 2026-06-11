import React, { useState, useEffect } from 'react'
import { supabase } from '../integrations/supabase/client'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Mail, Lock, ArrowRight, Eye, EyeOff, Activity, MapPin, Bell } from 'lucide-react'
import { useTranslation } from '../contexts/LanguageContext'

export default function Login() {
  const nav = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) nav('/dashboard')
    })
  }, [nav])

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    if (data?.user) nav('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-[100px] animate-pulse-slow" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[100px] animate-pulse-slow" />

      <div className="w-full max-w-[440px] animate-slide-up relative z-10">
        <div className="glass rounded-[40px] p-8 md:p-10 shadow-2xl border-white/40">
          
          <div className="flex flex-col items-center text-center mb-10">
            <div className="h-20 w-20 flex items-center justify-center rounded-[28px] bg-slate-900 text-white shadow-2xl mb-6 ring-1 ring-white/20">
              <ShieldCheck size={40} className="animate-pulse" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{t('Terminal Access')}</h1>
            <p className="mt-2 text-slate-500 font-bold uppercase tracking-widest text-[10px]">{t('Authorized Emergency Personnel Only')}</p>
          </div>

          <form onSubmit={signIn} className="space-y-6">
            <div>
              <label>{t('Email Address')}</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors">
                  <Mail size={20} />
                </div>
                <input
                  placeholder={t('field.agent@mella.responder')}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="pl-12"
                />
              </div>
            </div>

            <div>
              <label>{t('Field Password')}</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="pl-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-black animate-shake">
                <ShieldCheck size={16} />
                <span className="uppercase">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[64px] rounded-[24px] bg-slate-900 text-white font-black text-lg shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 transition-all hover:bg-black hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? (
                <div className="h-6 w-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {t('INITIALIZE SESSION')}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm font-bold text-slate-400">
              {t('NEW RESPONDER?')} <Link to="/signup" className="text-orange-600 hover:underline ml-1">{t('ENROLL IN FLEET')}</Link>
            </p>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-100">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-orange-50 text-orange-600 mb-2">
                  <Activity size={18} />
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase">{t('Live Ops')}</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-2">
                  <MapPin size={18} />
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase">{t('GPS Link')}</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-2">
                  <Bell size={18} />
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase">{t('Dispatch')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
