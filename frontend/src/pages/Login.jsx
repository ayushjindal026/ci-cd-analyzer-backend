import { Activity, Zap, Shield, TrendingUp, GitBranch, CheckCircle } from 'lucide-react'

// ── Your backend's GitHub OAuth entry point ───────────────────────────────────
const GITHUB_LOGIN_URL = 'http://localhost:8081/api/v1/auth/github/login'

const FEATURES = [
    { icon: Zap, text: 'AI-powered failure diagnosis', sub: 'Root cause in seconds' },
    { icon: TrendingUp, text: 'Predictive pipeline health scoring', sub: 'Catch failures before they happen' },
    { icon: Shield, text: 'Stage-level root cause analysis', sub: 'Build · Test · Deploy breakdown' },
    { icon: GitBranch, text: 'Multi-repo pipeline observability', sub: 'All your repos in one place' },
]

const STATS = [
    { value: '10×', label: 'Faster diagnosis' },
    { value: '68%', label: 'Fewer incidents' },
    { value: '24/7', label: 'AI monitoring' },
]

export function Login() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4 relative overflow-hidden">

            {/* Background glows */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-900/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-4xl flex flex-col lg:flex-row gap-12 items-center">

                {/* ── Left hero (desktop only) ───────────────────────────────────── */}
                <div className="flex-1 hidden lg:block animate-fade-in">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-900/60 border border-brand-700/50 text-brand-300 text-xs font-medium mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                        Phase 1 · Dashboard live
                    </div>

                    <h1 className="text-4xl font-bold text-white leading-tight mb-3">
                        Your CI/CD pipelines,<br />
                        <span className="text-brand-400">AI-analyzed.</span>
                    </h1>
                    <p className="text-gray-400 text-base mb-8 leading-relaxed max-w-md">
                        PipelineIQ connects to your GitHub repositories, analyzes pipeline runs,
                        and gives you AI-powered diagnosis and predictions — all in one dashboard.
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-8 mb-8">
                        {STATS.map(({ value, label }) => (
                            <div key={label}>
                                <p className="text-2xl font-bold text-white">{value}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Features */}
                    <div className="space-y-4">
                        {FEATURES.map(({ icon: Icon, text, sub }) => (
                            <div key={text} className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-brand-900/60 border border-brand-800/60 flex items-center justify-center flex-shrink-0">
                                    <Icon size={16} className="text-brand-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-200">{text}</p>
                                    <p className="text-xs text-gray-500">{sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Login card ─────────────────────────────────────────────────── */}
                <div className="w-full max-w-sm animate-slide-up">
                    <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-8 shadow-2xl">

                        {/* Logo */}
                        <div className="flex flex-col items-center mb-7">
                            <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-900/50 mb-4">
                                <Activity size={26} className="text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-white">PipelineIQ</h2>
                            <p className="text-gray-400 text-sm mt-1 text-center">AI-powered CI/CD pipeline analyzer</p>
                        </div>

                        {/* Mobile feature list */}
                        <div className="lg:hidden mb-6 space-y-2">
                            {FEATURES.map(({ text }) => (
                                <div key={text} className="flex items-center gap-2 text-xs text-gray-400">
                                    <CheckCircle size={12} className="text-brand-400 flex-shrink-0" />
                                    {text}
                                </div>
                            ))}
                        </div>

                        {/* GitHub OAuth button → custom backend route */}
                        <a
                            href={GITHUB_LOGIN_URL}
                            className="
                flex items-center justify-center gap-3 w-full py-3 px-5 rounded-xl
                bg-white text-gray-900 font-semibold text-sm
                hover:bg-gray-100 active:scale-[0.98]
                transition-all duration-150 shadow-lg hover:shadow-xl
              "
                        >
                            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="currentColor" aria-hidden>
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
                        </a>

                        {/* Trust signals */}
                        <div className="flex items-center gap-3 my-5">
                            <div className="flex-1 h-px bg-gray-800" />
                            <span className="text-xs text-gray-600">what we store</span>
                            <div className="flex-1 h-px bg-gray-800" />
                        </div>

                        <div className="space-y-2">
                            {[
                                [true, 'Repository names & run metadata only'],
                                [true, 'Pipeline results, timings, stage data'],
                                [false, 'Your source code is never read or stored'],
                            ].map(([ok, text]) => (
                                <div key={text} className="flex items-center gap-2 text-xs">
                                    <span className={ok ? 'text-emerald-500' : 'text-gray-600'}>{ok ? '✓' : '✗'}</span>
                                    <span className={ok ? 'text-gray-400' : 'text-gray-600'}>{text}</span>
                                </div>
                            ))}
                        </div>

                        <p className="text-center text-[11px] text-gray-700 mt-6">
                            PipelineIQ · Personal Project · Spring Boot + React + Docker
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}