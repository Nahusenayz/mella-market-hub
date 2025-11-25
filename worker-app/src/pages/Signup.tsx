import React, { useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { useNavigate, Link } from 'react-router-dom'

export default function Signup() {
    const nav = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [category, setCategory] = useState('police')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const signUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    category: category,
                    app_role: 'worker' // Renamed from role to avoid conflicts
                }
            }
        })

        setLoading(false)
        if (error) {
            setError(error.message)
            return
        }

        if (data.user) {
            // Auto sign in or redirect
            nav('/dashboard')
        }
    }

    return (
        <div className="container" style={{ maxWidth: 400, marginTop: '4rem' }}>
            <form onSubmit={signUp} style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#333' }}>Worker Registration</h2>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Full Name</label>
                        <input
                            placeholder="John Doe"
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Service Category</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                border: '2px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                background: '#f9fafb'
                            }}
                        >
                            <option value="police">👮 Police</option>
                            <option value="ambulance">🚑 Ambulance</option>
                            <option value="traffic_police">🚦 Traffic Police</option>
                            <option value="fire_truck">🚒 Fire Truck</option>
                            <option value="tow_truck">🏗️ Tow Truck</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Email</label>
                        <input
                            placeholder="officer@example.com"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Password</label>
                        <input
                            placeholder="••••••••"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>

                {error && <div className="error-message" style={{ marginTop: '1rem' }}>{error}</div>}

                <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '1.5rem' }}>
                    {loading ? 'Creating Account...' : 'Register as Worker'}
                </button>

                <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </form>
        </div>
    )
}
