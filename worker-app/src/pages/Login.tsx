import React, { useState, useEffect } from 'react'
import { supabase } from '../integrations/supabase/client'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        nav('/dashboard')
      }
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
    <div className="login-container">
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(249, 115, 22, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'float 6s ease-in-out infinite',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '15%',
        width: '250px',
        height: '250px',
        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'float 8s ease-in-out infinite reverse',
        pointerEvents: 'none'
      }} />

      <div className="login-card animate-scale-in">
        <form onSubmit={signIn}>
          {/* Logo */}
          <div className="login-logo">
            <span>🚨</span>
          </div>

          {/* Title */}
          <h2 className="login-title">Emergency Responder</h2>
          <p className="login-subtitle">Sign in to your responder dashboard</p>

          {/* Email Input */}
          <div className="form-group delay-100">
            <label>Email Address</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '1.25rem',
                opacity: 0.5
              }}>📧</span>
              <input
                placeholder="responder@example.com"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ paddingLeft: '3rem' }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="form-group delay-200">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '1.25rem',
                opacity: 0.5
              }}>🔒</span>
              <input
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  opacity: 0.5
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message" style={{ marginTop: '1rem' }}>
              <span style={{ marginRight: '0.5rem' }}>⚠️</span>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="form-group delay-300" style={{ marginTop: '1.5rem' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                fontSize: '1.125rem',
                padding: '1rem'
              }}
            >
              {loading ? (
                <>
                  <span className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span style={{ fontSize: '1.25rem' }}>→</span>
                </>
              )}
            </button>
          </div>

          {/* Register Link */}
          <div className="form-group delay-400" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              New emergency responder?{' '}
              <Link to="/signup" style={{ fontWeight: 600 }}>Register here</Link>
            </p>
          </div>

          {/* Features */}
          <div className="form-group delay-500" style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>⚡</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Real-time Alerts</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📍</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>GPS Tracking</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🔔</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Instant Notify</div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
