import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'

export default function App() {
  const loc = useLocation()
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <header className="flex-none flex justify-between items-center px-4 py-3 bg-white/90 backdrop-blur-md shadow-sm z-50">
        <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">Mella Responder</h1>
        <nav className="flex gap-3 text-sm font-medium">
          <Link to="/login" className={`${loc.pathname.includes('login') ? 'text-orange-600' : 'text-gray-600'} hover:text-orange-500 transition-colors`}>Login</Link>
          <Link to="/signup" className={`${loc.pathname.includes('signup') ? 'text-orange-600' : 'text-gray-600'} hover:text-orange-500 transition-colors`}>Sign Up</Link>
          <Link to="/dashboard" className={`${loc.pathname.includes('dashboard') ? 'text-orange-600' : 'text-gray-600'} hover:text-orange-500 transition-colors`}>Dashboard</Link>
        </nav>
      </header>
      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth w-full relative">
        <Outlet />
      </main>
    </div>
  )
}
