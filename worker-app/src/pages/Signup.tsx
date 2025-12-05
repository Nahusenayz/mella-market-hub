import React, { useState, useEffect } from 'react'
import { supabase } from '../integrations/supabase/client'
import { useNavigate, Link } from 'react-router-dom'

export default function Signup() {
    const nav = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [category, setCategory] = useState('police')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [step, setStep] = useState(1) // Multi-step form
    const [locationGranted, setLocationGranted] = useState(false)
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

    const categories = [
        { id: 'police', icon: '👮', label: 'Police Officer', color: '#1e40af', gradient: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)' },
        { id: 'ambulance', icon: '🚑', label: 'Paramedic', color: '#dc2626', gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' },
        { id: 'traffic_police', icon: '🚦', label: 'Traffic Control', color: '#d97706', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
        { id: 'fire_truck', icon: '🚒', label: 'Firefighter', color: '#ea580c', gradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)' },
        { id: 'tow_truck', icon: '🏗️', label: 'Tow Operator', color: '#4b5563', gradient: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)' }
    ]

    // Request location permission
    const requestLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser')
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                })
                setLocationGranted(true)
            },
            (error) => {
                console.error('Location error:', error)
                setError('Location access denied. You can still register but your location won\'t be shown to users.')
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    useEffect(() => {
        // Auto-request location on mount
        requestLocation()
    }, [])

    const signUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        setLoading(true)

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    category: category,
                    app_role: 'worker',
                    location_lat: userLocation?.lat,
                    location_lng: userLocation?.lng
                }
            }
        })

        if (error) {
            setLoading(false)
            setError(error.message)
            return
        }

        // Wait a moment for the profile trigger to create the profile
        if (data.user && userLocation) {
            // Small delay to ensure profile is created by trigger
            await new Promise(resolve => setTimeout(resolve, 1000))

            // Try to insert worker location
            const { error: locError } = await supabase
                .from('worker_locations')
                .upsert({
                    worker_id: data.user.id,
                    category: category,
                    location_lat: userLocation.lat,
                    location_lng: userLocation.lng,
                    is_available: true,
                    last_updated: new Date().toISOString()
                }, { onConflict: 'worker_id' })

            if (locError) {
                console.error('Error saving worker location:', locError)
                // Don't block signup for this error
            } else {
                console.log('Worker location saved successfully!')
            }
        }

        setLoading(false)
        if (data.user) {
            nav('/dashboard')
        }
    }

    const nextStep = () => {
        if (step === 1 && !fullName.trim()) {
            setError('Please enter your full name')
            return
        }
        setError(null)
        setStep(step + 1)
    }

    const prevStep = () => {
        setError(null)
        setStep(step - 1)
    }

    const selectedCategory = categories.find(c => c.id === category)

    return (
        <div className="login-container">
            {/* Animated background */}
            <div style={{
                position: 'absolute',
                top: '15%',
                right: '5%',
                width: '350px',
                height: '350px',
                background: 'radial-gradient(circle, rgba(249, 115, 22, 0.15) 0%, transparent 70%)',
                borderRadius: '50%',
                animation: 'float 7s ease-in-out infinite',
                pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute',
                bottom: '20%',
                left: '10%',
                width: '280px',
                height: '280px',
                background: 'radial-gradient(circle, rgba(239, 68, 68, 0.12) 0%, transparent 70%)',
                borderRadius: '50%',
                animation: 'float 9s ease-in-out infinite reverse',
                pointerEvents: 'none'
            }} />

            <div className="login-card animate-scale-in" style={{ maxWidth: '480px' }}>
                <form onSubmit={signUp}>
                    {/* Logo */}
                    <div className="login-logo" style={{ background: selectedCategory?.gradient || 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}>
                        <span>{selectedCategory?.icon || '🚨'}</span>
                    </div>

                    {/* Title */}
                    <h2 className="login-title">Worker Registration</h2>
                    <p className="login-subtitle">Join our emergency response network</p>

                    {/* Progress Steps */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginBottom: '2rem'
                    }}>
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                style={{
                                    width: s === step ? '2rem' : '0.5rem',
                                    height: '0.5rem',
                                    borderRadius: '0.25rem',
                                    background: s <= step
                                        ? 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)'
                                        : '#e5e7eb',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </div>

                    {/* Step 1: Personal Info */}
                    {step === 1 && (
                        <div className="animate-fade-in">
                            <div className="form-group delay-100">
                                <label>Full Name</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{
                                        position: 'absolute',
                                        left: '1rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        fontSize: '1.25rem',
                                        opacity: 0.5
                                    }}>👤</span>
                                    <input
                                        placeholder="John Doe"
                                        type="text"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        required
                                        style={{ paddingLeft: '3rem' }}
                                    />
                                </div>
                            </div>

                            <div className="form-group delay-200">
                                <label>Service Category</label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '0.75rem',
                                    marginTop: '0.5rem'
                                }}>
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setCategory(cat.id)}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '1rem',
                                                borderRadius: '12px',
                                                border: category === cat.id ? `2px solid ${cat.color}` : '2px solid #e5e7eb',
                                                background: category === cat.id ? `${cat.color}10` : 'white',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                transform: category === cat.id ? 'scale(1.02)' : 'scale(1)'
                                            }}
                                        >
                                            <span style={{ fontSize: '1.75rem' }}>{cat.icon}</span>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: category === cat.id ? cat.color : '#6b7280'
                                            }}>{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Location */}
                    {step === 2 && (
                        <div className="animate-fade-in">
                            <div className="form-group delay-100">
                                <div style={{
                                    textAlign: 'center',
                                    padding: '2rem',
                                    background: locationGranted
                                        ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                                        : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                    borderRadius: '16px',
                                    marginBottom: '1rem'
                                }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                                        {locationGranted ? '✅' : '📍'}
                                    </div>
                                    <h3 style={{
                                        fontWeight: 700,
                                        marginBottom: '0.5rem',
                                        color: locationGranted ? '#065f46' : '#92400e'
                                    }}>
                                        {locationGranted ? 'Location Enabled!' : 'Enable Location'}
                                    </h3>
                                    <p style={{
                                        fontSize: '0.875rem',
                                        color: locationGranted ? '#047857' : '#a16207',
                                        marginBottom: locationGranted ? 0 : '1rem'
                                    }}>
                                        {locationGranted
                                            ? 'Your location will be shared with users seeking emergency help.'
                                            : 'Allow location access so users can find you during emergencies.'
                                        }
                                    </p>
                                    {!locationGranted && (
                                        <button
                                            type="button"
                                            onClick={requestLocation}
                                            style={{
                                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                color: 'white',
                                                padding: '0.75rem 1.5rem',
                                                fontSize: '0.875rem'
                                            }}
                                        >
                                            📍 Grant Location Access
                                        </button>
                                    )}
                                </div>
                                {userLocation && (
                                    <p style={{
                                        fontSize: '0.75rem',
                                        color: '#6b7280',
                                        textAlign: 'center'
                                    }}>
                                        Coordinates: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Account */}
                    {step === 3 && (
                        <div className="animate-fade-in">
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
                                        minLength={6}
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

                            <div className="form-group delay-300">
                                <label>Confirm Password</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{
                                        position: 'absolute',
                                        left: '1rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        fontSize: '1.25rem',
                                        opacity: 0.5
                                    }}>🔐</span>
                                    <input
                                        placeholder="••••••••"
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        required
                                        style={{ paddingLeft: '3rem' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="error-message" style={{ marginTop: '1rem' }}>
                            <span style={{ marginRight: '0.5rem' }}>⚠️</span>
                            {error}
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        marginTop: '1.5rem'
                    }}>
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="btn-secondary"
                                style={{ flex: 1 }}
                            >
                                ← Back
                            </button>
                        )}
                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                style={{
                                    flex: step === 1 ? 1 : 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <span>Continue</span>
                                <span>→</span>
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    flex: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem'
                                }}
                            >
                                {loading ? (
                                    <>
                                        <span className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                                        <span>Creating Account...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Complete Registration</span>
                                        <span>✓</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Login Link */}
                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                            Already have an account?{' '}
                            <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    )
}
