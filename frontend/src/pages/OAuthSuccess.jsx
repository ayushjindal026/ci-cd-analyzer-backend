import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tokenStorage } from '@/context/AuthContext'
import { Activity } from 'lucide-react'

export default function OAuthSuccess() {
    const navigate = useNavigate()
    const [error, setError] = useState(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)

        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (!accessToken || !refreshToken) {
            setError('No authentication tokens received from server.')

            setTimeout(() => {
                navigate('/login', { replace: true })
            }, 2000)

            return
        }

        try {
            // Store the complete token pair.
            tokenStorage.setBoth(
                accessToken,
                refreshToken
            )

            // Remove tokens from the browser URL/history.
            window.history.replaceState(
                {},
                document.title,
                '/oauth-success'
            )

            /*
             * Do NOT call /auth/me here.
             *
             * AuthContext will validate the access token after
             * the application mounts. This avoids having two
             * independent authentication flows racing each other.
             */
            window.location.replace('/')
        } catch (err) {
            console.error(
                'OAuth token storage failed:',
                err
            )

            tokenStorage.clear()

            setError(
                'Authentication setup failed.'
            )

            setTimeout(() => {
                navigate('/login', { replace: true })
            }, 2000)
        }
    }, [navigate])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
            <div className="text-center animate-fade-in">

                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 mb-5 shadow-lg shadow-brand-900/50">
                    <Activity
                        size={28}
                        className="text-white"
                    />
                </div>

                {error ? (
                    <>
                        <p className="text-red-400 font-medium mb-1">
                            Authentication failed
                        </p>

                        <p className="text-sm text-gray-500">
                            {error}
                        </p>

                        <p className="text-xs text-gray-600 mt-3">
                            Redirecting to login…
                        </p>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-center gap-2 mb-3">
                            {[0, 150, 300].map(delay => (
                                <div
                                    key={delay}
                                    className="w-2 h-2 rounded-full bg-brand-400 animate-bounce"
                                    style={{
                                        animationDelay: `${delay}ms`
                                    }}
                                />
                            ))}
                        </div>

                        <p className="text-white font-semibold">
                            Signing you in…
                        </p>

                        <p className="text-sm text-gray-400 mt-1">
                            Setting up your dashboard
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}