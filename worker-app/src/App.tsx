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
    <div className="flex flex-col min-h-screen w-full bg-slate-50">
      <header className="sticky top-0 left-0 right-0 flex-none z-50 border-b border-white/60 bg-white/85 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link to={isAuthenticated ? '/dashboard' : '/login'} className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black tracking-tight text-gray-900">Mella Responder</h1>
              <p className="hidden text-xs text-gray-500 sm:block">Live emergency dispatch</p>
            </div>
          </Link>

          <nav className="flex items-center gap-2 text-sm font-medium">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 transition-colors ${
                    loc.pathname.includes('dashboard') ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-3 py-2 text-white transition-colors hover:bg-black"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`rounded-full px-3 py-2 transition-colors ${
                    loc.pathname.includes('login') ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className={`rounded-full px-3 py-2 transition-colors ${
                    loc.pathname.includes('signup') ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  Sign Up
                </Link>
              </>
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
