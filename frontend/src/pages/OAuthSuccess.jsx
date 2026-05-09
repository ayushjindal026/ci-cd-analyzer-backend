import { useEffect } from 'react'

export default function OAuthSuccess() {

    useEffect(() => {

        const params =
            new URLSearchParams(window.location.search)

        const token =
            params.get('token')

        if (token) {

            localStorage.setItem(
                'token',
                token
            )

            // Clean redirect to dashboard
            window.location.href = '/'
        } else {

            window.location.href = '/login'
        }

    }, [])

    return (

        <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">

            <div className="text-center">

                <div className="text-2xl font-semibold mb-2">
                    Signing you in...
                </div>

                <div className="text-gray-400 text-sm">
                    Finalizing authentication
                </div>

            </div>

        </div>
    )
}