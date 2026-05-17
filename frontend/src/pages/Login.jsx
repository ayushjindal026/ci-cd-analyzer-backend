import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Activity, Zap, Shield, TrendingUp, GitBranch, CheckCircle,
    ChevronDown, ChevronUp, Lock, Eye, Code, Database,
    GitCommit, Play, CheckCircle2, XCircle, Clock, ArrowRight,
    FlaskConical,
} from 'lucide-react'

const GITHUB_LOGIN_URL =
    import.meta.env.VITE_GITHUB_LOGIN_URL ??
    'http://localhost:8081/api/v1/auth/github/login'

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

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

// What we read vs. what we never touch
const PERMISSIONS = [
    {
        icon: Eye,
        title: 'Repository metadata',
        description: 'Names, branches, visibility — so we know what to monitor.',
        read: true,
    },
    {
        icon: GitCommit,
        title: 'Workflow run results',
        description: 'Pass/fail status, duration, triggered events from GitHub Actions.',
        read: true,
    },
    {
        icon: Database,
        title: 'Log files (on demand)',
        description: 'Only fetched when you click "AI Diagnosis". Never stored raw.',
        read: true,
    },
    {
        icon: Code,
        title: 'Your source code',
        description: 'We never request, read, or store a single line of your code.',
        read: false,
    },
    {
        icon: Lock,
        title: 'Secrets & env vars',
        description: 'GitHub OAuth scope never grants access to repository secrets.',
        read: false,
    },
]

// Animated pipeline preview steps
const PIPELINE_STEPS = [
    { name: 'Checkout', status: 'success', dur: '8s' },
    { name: 'Build', status: 'success', dur: '1m 58s' },
    { name: 'Test', status: 'failed', dur: '45s' },
    { name: 'Docker', status: 'skipped', dur: '—' },
    { name: 'Deploy', status: 'skipped', dur: '—' },
]

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Collapsible "Why we need access" section */
function WhyWeNeedAccess() {
    const [open, setOpen] = useState(false)

    return (
        <div className="rounded-xl border border-gray-800 overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3
                   text-left text-xs text-gray-400 hover:text-gray-300
                   hover:bg-gray-800/50 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <Shield size={13} className="text-brand-400" />
                    Why do we need GitHub access?
                </span>
                {open
                    ? <ChevronUp size={13} />
                    : <ChevronDown size={13} />}
            </button>

            {open && (
                <div className="px-4 pb-4 space-y-2.5 animate-slide-up border-t border-gray-800 pt-3">
                    {PERMISSIONS.map(({ icon: Icon, title, description, read }) => (
                        <div key={title} className="flex items-start gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                ${read
                                    ? 'bg-brand-900/50 border border-brand-800'
                                    : 'bg-gray-800 border border-gray-700'}`}>
                                <Icon size={13} className={read ? 'text-brand-400' : 'text-gray-500'} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className={`text-xs font-semibold ${read ? 'text-gray-300' : 'text-gray-500'}`}>
                                        {title}
                                    </p>
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${read
                                            ? 'bg-brand-900/60 text-brand-400 border border-brand-800'
                                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                                        }`}>
                                        {read ? 'accessed' : 'never accessed'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{description}</p>
                            </div>
                        </div>
                    ))}

                    <div className="mt-3 pt-3 border-t border-gray-800 text-[11px] text-gray-600 leading-relaxed">
                        We request only <code className="font-mono text-gray-500 bg-gray-800 px-1 rounded">read:user</code>,{' '}
                        <code className="font-mono text-gray-500 bg-gray-800 px-1 rounded">user:email</code>, and{' '}
                        <code className="font-mono text-gray-500 bg-gray-800 px-1 rounded">public_repo</code> scopes.
                        For private repos you can optionally grant{' '}
                        <code className="font-mono text-gray-500 bg-gray-800 px-1 rounded">repo</code> after signup.
                        You can revoke access at any time from{' '}
                        <a
                            href="https://github.com/settings/applications"
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-500 hover:underline"
                        >
                            github.com/settings/applications
                        </a>.
                    </div>
                </div>
            )}
        </div>
    )
}

/** Animated pipeline run preview */
function AnimatedPipelinePreview() {
    const [activeStep, setActiveStep] = useState(null)

    return (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 overflow-hidden">
            {/* Fake terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-900/80">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                <span className="ml-2 text-xs text-gray-500 font-mono">
                    acme-corp / api-gateway — run #247
                </span>
            </div>

            {/* Pipeline steps */}
            <div className="p-4 space-y-2">
                {PIPELINE_STEPS.map((step, i) => {
                    const isActive = activeStep === i
                    return (
                        <div
                            key={step.name}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer
                transition-all duration-150
                ${step.status === 'failed'
                                    ? 'bg-red-900/20 border border-red-900/40'
                                    : isActive
                                        ? 'bg-gray-800 border border-gray-700'
                                        : 'hover:bg-gray-800/60 border border-transparent'}`}
                            onClick={() => setActiveStep(isActive ? null : i)}
                        >
                            {/* Status icon */}
                            {step.status === 'success' && (
                                <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                            )}
                            {step.status === 'failed' && (
                                <XCircle size={15} className="text-red-500 flex-shrink-0" />
                            )}
                            {step.status === 'skipped' && (
                                <div className="w-3.5 h-3.5 rounded-full border border-gray-600 flex-shrink-0" />
                            )}

                            <span className={`text-sm font-medium flex-1 ${step.status === 'failed' ? 'text-red-300' :
                                    step.status === 'skipped' ? 'text-gray-600' :
                                        'text-gray-200'
                                }`}>
                                {step.name}
                            </span>

                            <span className="font-mono text-xs text-gray-500">{step.dur}</span>
                        </div>
                    )
                })}

                {/* Fake AI diagnosis callout */}
                <div className="mt-3 rounded-xl border border-brand-800 bg-brand-900/20 p-3">
                    <div className="flex items-start gap-2">
                        <Zap size={14} className="text-brand-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold text-brand-300">AI Diagnosis</p>
                            <p className="text-[11px] text-brand-400 mt-0.5 leading-relaxed">
                                <strong>Test stage</strong> failed: Redis Testcontainer wasn't ready within 5s timeout.
                                Fix: increase wait strategy to 30s.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

/** Login card */
function LoginCard() {
    return (
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-8 shadow-2xl">

            {/* Logo */}
            <div className="flex flex-col items-center mb-7">
                <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-900/50 mb-4">
                    <Activity size={26} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">PipelineIQ</h2>
                <p className="text-gray-400 text-sm mt-1 text-center">
                    AI-powered CI/CD pipeline analyzer
                </p>
            </div>

            {/* Mobile features */}
            <div className="lg:hidden mb-6 space-y-2">
                {FEATURES.map(({ text }) => (
                    <div key={text} className="flex items-center gap-2 text-xs text-gray-400">
                        <CheckCircle size={12} className="text-brand-400 flex-shrink-0" />
                        {text}
                    </div>
                ))}
            </div>

            {/* GitHub OAuth */}
            <a
                href={GITHUB_LOGIN_URL}
                className="flex items-center justify-center gap-3 w-full py-3 px-5 rounded-xl
                   bg-white text-gray-900 font-semibold text-sm
                   hover:bg-gray-100 active:scale-[0.98]
                   transition-all duration-150 shadow-lg hover:shadow-xl"
            >
                <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="currentColor" aria-hidden>
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577
                   0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61
                   -.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729
                   1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998
                   .108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93
                   0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0
                   1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405
                   2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176
                   .765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92
                   .42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286
                   0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
                </svg>
                Continue with GitHub
            </a>

            {/* Demo mode CTA */}
            <Link
                to="/demo"
                className="flex items-center justify-center gap-2 w-full py-2.5 px-5 mt-3 rounded-xl
                   border border-gray-700 text-gray-300 text-sm font-medium
                   hover:bg-gray-800 hover:text-white hover:border-gray-600
                   active:scale-[0.98] transition-all duration-150"
            >
                <FlaskConical size={15} />
                Try Demo — no login required
            </Link>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-xs text-gray-600">what we access</span>
                <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* Quick trust signals */}
            <div className="space-y-1.5 mb-5">
                {[
                    [true, 'Repository names & workflow run results'],
                    [true, 'Pipeline logs — only when you request AI diagnosis'],
                    [false, 'Source code is never read or stored'],
                    [false, 'Repository secrets are never accessible'],
                ].map(([ok, text]) => (
                    <div key={text} className="flex items-center gap-2 text-xs">
                        <span className={ok ? 'text-emerald-500' : 'text-gray-600'}>{ok ? '✓' : '✗'}</span>
                        <span className={ok ? 'text-gray-400' : 'text-gray-600'}>{text}</span>
                    </div>
                ))}
            </div>

            {/* Expandable permissions explanation */}
            <WhyWeNeedAccess />

            <p className="text-center text-[11px] text-gray-700 mt-5">
                PipelineIQ · Personal Project · Spring Boot + React + Docker
            </p>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function Login() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4 relative overflow-hidden">

            {/* Background glows */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-brand-900/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-5xl flex flex-col lg:flex-row gap-10 items-start lg:items-center">

                {/* ── Left hero ───────────────────────────────────────────────────── */}
                <div className="flex-1 hidden lg:flex flex-col gap-8 animate-fade-in">

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full self-start
                          bg-brand-900/60 border border-brand-700/50 text-brand-300 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                        Phase 1 complete · Dashboard live
                    </div>

                    {/* Headline */}
                    <div>
                        <h1 className="text-4xl font-bold text-white leading-tight mb-3">
                            Your CI/CD pipelines,<br />
                            <span className="text-brand-400">AI-analyzed.</span>
                        </h1>
                        <p className="text-gray-400 text-base leading-relaxed max-w-md">
                            PipelineIQ connects to your GitHub repositories, analyzes pipeline runs,
                            and delivers AI-powered root-cause diagnosis — in seconds.
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-8">
                        {STATS.map(({ value, label }) => (
                            <div key={label}>
                                <p className="text-2xl font-bold text-white">{value}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Features */}
                    <div className="space-y-3">
                        {FEATURES.map(({ icon: Icon, text, sub }) => (
                            <div key={text} className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-brand-900/60 border border-brand-800/60
                                flex items-center justify-center flex-shrink-0">
                                    <Icon size={16} className="text-brand-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-200">{text}</p>
                                    <p className="text-xs text-gray-500">{sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Animated pipeline preview */}
                    <div>
                        <p className="text-xs text-gray-500 mb-3 flex items-center gap-2">
                            <Play size={11} className="text-brand-400" />
                            Live pipeline view — click a stage to inspect
                        </p>
                        <AnimatedPipelinePreview />
                    </div>

                    {/* Demo CTA inline */}
                    <Link
                        to="/demo"
                        className="inline-flex items-center gap-2 text-sm text-gray-400
                       hover:text-brand-300 transition-colors group"
                    >
                        <FlaskConical size={15} className="text-amber-400" />
                        Explore the demo dashboard without signing in
                        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {/* ── Right: login card ────────────────────────────────────────────── */}
                <div className="w-full max-w-sm animate-slide-up flex-shrink-0">
                    <LoginCard />
                </div>

            </div>
        </div>
    )
}