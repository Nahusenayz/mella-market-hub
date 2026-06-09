import React, { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './integrations/supabase/client'
import { LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react'

export default function App() {
  const loc = useLocation()
  const nav = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setIsAuthenticated(!!data.session)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    nav('/login')
  }

  return (
    <div className="flex flex-col min-h-screen w-full">
      <header className="sticky top-0 left-0 right-0 flex-none z-50 glass bg-white/70">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link to={isAuthenticated ? '/dashboard' : '/login'} className="flex items-center gap-3 min-w-0 transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xl">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black tracking-tight text-slate-900 uppercase">Mella Ops</h1>
              <p className="hidden text-[10px] font-black uppercase tracking-widest text-slate-400 sm:block">Field Responder</p>
            </div>
          </Link>

          <nav className="flex items-center gap-2 text-sm">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-black transition-all ${
                    loc.pathname.includes('dashboard') ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">TERMINAL</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 font-black text-white shadow-lg transition-all hover:bg-black active:scale-95"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">LOGOUT</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className={`rounded-2xl px-4 py-2 font-black transition-all ${
                    loc.pathname.includes('login') ? 'bg-orange-500 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  LOGIN
                </Link>
                <Link
                  to="/signup"
                  className={`rounded-2xl px-4 py-2 font-black transition-all ${
                    loc.pathname.includes('signup') ? 'bg-orange-500 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  SIGN UP
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full relative">
        <Outlet />
      </main>
    </div>
  )
}
