import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tokenStorage } from '@/context/AuthContext'
import { Activity } from 'lucide-react'

/**
 * Handles the post-OAuth redirect from the backend.
 *
 * New backend sends:  /oauth-success?access_token=...&refresh_token=...
 * Old backend sent:   /oauth-success?token=...
 *
 * We support both so a backend rollback doesn't break the frontend.
 */
export default function OAuthSuccess() {
    const navigate = useNavigate()
    const [error, setError] = useState(null)

    useEffect(() => {

        const params = new URLSearchParams(window.location.search)

        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (!accessToken || !refreshToken) {
            setError('Authentication failed')
            return
        }

        tokenStorage.setBoth(
            accessToken,
            refreshToken
        )

        // IMPORTANT:
        // wait one tick so localStorage fully commits

        setTimeout(() => {

            window.location.replace('/')

        }, 100)

    }, [])

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
                            {[0, 150, 300].map(delay => (
                                <div
                                    key={delay}
                                    className="w-2 h-2 rounded-full bg-brand-400 animate-bounce"
                                    style={{ animationDelay: `${delay}ms` }}
                                />
                            ))}
                        </div>
                        <p className="text-white font-semibold">Signing you in…</p>
                        <p className="text-sm text-gray-400 mt-1">Setting up your dashboard</p>
                    </>
                )}
            </div>
        </div>
    )
}