// ─── src/pages/Login.jsx ──────────────────────────────────────────────────────
import { GitBranch, Zap, Shield, TrendingUp } from 'lucide-react'

const FEATURES = [
    { icon: Zap, text: 'AI-powered failure diagnosis' },
    { icon: TrendingUp, text: 'Predictive pipeline health scoring' },
    { icon: Shield, text: 'Stage-level root cause analysis' },
    { icon: GitBranch, text: 'Multi-repo pipeline observability' },
]

export function Login() {

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-brand-900 p-4">
            <div className="w-full max-w-md animate-slide-up">

                {/* Card */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl text-center">

                    {/* Logo */}
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 mb-5 shadow-lg">
                        <GitBranch size={28} className="text-white" />
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-1">PipelineIQ</h1>
                    <p className="text-gray-400 text-sm mb-8">
                        AI-powered CI/CD pipeline analyzer.<br />Monitor, diagnose, predict.
                    </p>

                    {/* Feature list */}
                    <ul className="space-y-2.5 mb-8 text-left">
                        {FEATURES.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-center gap-3 text-sm text-gray-300">
                                <span className="p-1.5 rounded-lg bg-brand-900/60 text-brand-400">
                                    <Icon size={14} />
                                </span>
                                {text}
                            </li>
                        ))}
                    </ul>

                    {/* OAuth button */}
                    <button
                        onClick={() => {
                            window.location.href =
                                'http://localhost:8081/api/v1/auth/github/login'
                        }}
                        className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl
                                    bg-white text-gray-900 font-semibold text-sm hover:bg-gray-100
                                    transition-all shadow-md hover:shadow-lg"
                    >

                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577
                       0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755
                       -1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305
                       3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93
                       0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322
                       3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405
                       2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84
                       1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81
                       2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795
                       24 17.295 24 12c0-6.63-5.37-12-12-12"/>
                        </svg>
                        Continue with GitHub
                    </button>

                    <p className="text-xs text-gray-600 mt-4">
                        By signing in you agree to store your GitHub repository metadata only. No code is ever read or stored.
                    </p>
                </div>

                <p className="text-center text-xs text-gray-600 mt-4">
                    PipelineIQ · Personal Project · Spring Boot + React
                </p>
            </div>
        </div >
    )
}