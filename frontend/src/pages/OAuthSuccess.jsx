import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tokenStorage } from '@/context/AuthContext'
import { Activity } from 'lucide-react'

/**
 * Landing page after GitHub OAuth.
 * Backend redirects to: /oauth-success?token=<jwt>
 *
 * This component:
 *   1. Reads the token from the URL
 *   2. Saves it to localStorage via tokenStorage
 *   3. Redirects to /  (dashboard)
 */
export default function OAuthSuccess() {
    const navigate = useNavigate()
    const [error, setError] = useState(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const token = params.get('token')

        if (token) {
            tokenStorage.set(token)
            // Clean the token from the URL before navigating
            window.history.replaceState({}, document.title, '/oauth-success')
            // Small delay so user sees the success state
            setTimeout(() => navigate('/', { replace: true }), 800)
        } else {
            setError('No token received from server. Please try signing in again.')
            setTimeout(() => navigate('/login', { replace: true }), 3000)
        }
    }, [navigate])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
            <div className="text-center animate-fade-in">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 mb-5 shadow-lg shadow-brand-900/50">
                    <Activity size={28} className="text-white" />
                </div>

                {error ? (
                    <>
                        <p className="text-red-400 font-medium mb-1">Authentication failed</p>
                        <p className="text-sm text-gray-500">{error}</p>
                        <p className="text-xs text-gray-600 mt-3">Redirecting to login…</p>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <p className="text-white font-semibold">Signing you in…</p>
                        <p className="text-sm text-gray-400 mt-1">Setting up your dashboard</p>
                    </>
                )}
            </div>
        </div>
    )
}