import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'

export default function App() {
  const loc = useLocation()
  return (
    <div>
      <header className="flex justify-between items-center">
        <h1>Mella Responder</h1>
        <nav className="flex gap-3">
          <Link to="/login" style={{ textDecoration: loc.pathname.includes('login') ? 'underline' : 'none' }}>Login</Link>
          <Link to="/signup" style={{ textDecoration: loc.pathname.includes('signup') ? 'underline' : 'none' }}>Sign Up</Link>
          <Link to="/dashboard" style={{ textDecoration: loc.pathname.includes('dashboard') ? 'underline' : 'none' }}>Dashboard</Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
