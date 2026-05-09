import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import {
    Globe,
    Moon,
    Sun,
    Bell,
    Shield,
    LogOut,
    ExternalLink,
    Check,
    AlertCircle,
    Webhook,
    Key,
    Trash2
} from 'lucide-react'
import { ErrorBanner } from '@/components/ui'

/* ── Reusable section wrapper ─────────────────────────────────────────────── */
function Section({ title, description, badge, children }) {
    return (
        <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-2">
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{title}</h3>
                    {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
                </div>
                {badge}
            </div>
            <div className="px-6 py-5 space-y-4">{children}</div>
        </div>
    )
}

/* ── Toggle row ───────────────────────────────────────────────────────────── */
function ToggleRow({ label, description, checked, onChange, disabled = false }) {
    return (
        <div className="flex items-center justify-between py-0.5">
            <div className="min-w-0 pr-4">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
            </div>
            <button
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`
          relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
          disabled:opacity-40 disabled:cursor-not-allowed
          ${checked ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'}
        `}
            >
                <span className={`
          inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200
          ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}
        `} />
            </button>
        </div>
    )
}

/* ── Info row ─────────────────────────────────────────────────────────────── */
function InfoRow({ label, value }) {
    return (
        <div className="flex items-center justify-between text-sm py-0.5">
            <span className="text-gray-500 dark:text-gray-400">{label}</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{value}</span>
        </div>
    )
}

/* ── Saved toast ──────────────────────────────────────────────────────────── */
function SavedToast({ show }) {
    if (!show) return null
    return (
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 animate-fade-in">
            <Check size={13} />
            Saved
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function Settings() {
    const { user, logout } = useAuth()
    const { dark, toggle } = useTheme()

    // Notification prefs
    const [notif, setNotif] = useState({
        emailOnFailure: true,
        emailOnRecovery: false,
        slackWebhook: false,
        failureOnly: true,
        aiSummary: true,
    })
    const [webhook, setWebhook] = useState('')
    const [threshold, setThreshold] = useState(20)
    const [savedNotif, setSavedNotif] = useState(false)
    const [savedAlerts, setSavedAlerts] = useState(false)
    const [danger, setDanger] = useState(false)

    const saveNotif = () => {
        setSavedNotif(true)
        setTimeout(() => setSavedNotif(false), 2500)
    }

    const saveAlerts = () => {
        setSavedAlerts(true)
        setTimeout(() => setSavedAlerts(false), 2500)
    }

    return (
        <div className="max-w-2xl space-y-5 animate-fade-in">

            {/* ── Profile ──────────────────────────────────────────────────────── */}
            <Section
                title="GitHub Profile"
                description="Your identity connected via GitHub OAuth 2.0."
                badge={<span className="badge-success text-xs">Connected</span>}
            >
                {user ? (
                    <div className="flex items-center gap-4">
                        <img
                            src={
                                user.avatarUrl ?? user.avatar_url ??
                                `https://ui-avatars.com/api/?name=${user.login ?? 'U'}&background=4f46e5&color=fff&size=80`
                            }
                            alt={user.login}
                            className="w-14 h-14 rounded-full ring-2 ring-brand-200 dark:ring-brand-800 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                                {user.name ?? user.login}
                            </p>
                            <p className="text-sm text-gray-500">@{user.login}</p>
                            {user.email && <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>}
                        </div>
                        <a
                            href={`https://github.com/${user.login}`}
                            target="_blank" rel="noreferrer"
                            className="btn-secondary btn-sm flex-shrink-0"
                        >
                            <Globe size={13} />
                            Profile
                            <ExternalLink size={10} />
                        </a>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <AlertCircle size={15} />
                        Not authenticated. <a href="http://localhost:8081/api/v1/auth/github/login" className="text-brand-500 hover:underline">Sign in with GitHub</a>
                    </div>
                )}
            </Section>

            {/* ── Appearance ────────────────────────────────────────────────────── */}
            <Section title="Appearance" description="Dashboard theme preference.">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${dark ? 'bg-brand-900/30 text-brand-400' : 'bg-amber-100 text-amber-500'}`}>
                            {dark ? <Moon size={16} /> : <Sun size={16} />}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                {dark ? 'Dark mode' : 'Light mode'}
                            </p>
                            <p className="text-xs text-gray-400">Saved to your browser</p>
                        </div>
                    </div>
                    <button onClick={toggle} className="btn-secondary btn-sm">
                        Switch to {dark ? 'Light' : 'Dark'}
                    </button>
                </div>
            </Section>

            {/* ── Alert thresholds ──────────────────────────────────────────────── */}
            <Section title="Alert Thresholds" description="Configure when alerts fire based on pipeline health.">
                <div className="space-y-3">
                    <div>
                        <label className="label">Failure rate threshold (%)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range" min={5} max={80} step={5}
                                value={threshold}
                                onChange={e => setThreshold(+e.target.value)}
                                className="flex-1 accent-brand-600"
                            />
                            <span className="w-12 text-center font-mono text-sm font-semibold text-brand-600 dark:text-brand-400">
                                {threshold}%
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            Alerts fire when failure rate crosses this threshold over any 24-hour window.
                        </p>
                    </div>

                    <div>
                        <label className="label">Slack Webhook URL</label>
                        <input
                            className="input text-sm"
                            placeholder="https://hooks.slack.com/services/…"
                            value={webhook}
                            onChange={e => setWebhook(e.target.value)}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Phase 2 feature — Slack integration. Paste your incoming webhook URL.
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                    <SavedToast show={savedAlerts} />
                    <button className="btn-primary btn-sm ml-auto" onClick={saveAlerts}>
                        <Check size={13} /> Save thresholds
                    </button>
                </div>
            </Section>

            {/* ── Notifications ─────────────────────────────────────────────────── */}
            <Section title="Notification Preferences" description="Choose what events trigger notifications.">
                <div className="space-y-4 divide-y divide-gray-100 dark:divide-gray-800">
                    <ToggleRow
                        label="Email on failure"
                        description="Receive an email when any pipeline fails."
                        checked={notif.emailOnFailure}
                        onChange={v => setNotif(n => ({ ...n, emailOnFailure: v }))}
                    />
                    <div className="pt-3">
                        <ToggleRow
                            label="Email on recovery"
                            description="Notify when a previously failing pipeline passes again."
                            checked={notif.emailOnRecovery}
                            onChange={v => setNotif(n => ({ ...n, emailOnRecovery: v }))}
                        />
                    </div>
                    <div className="pt-3">
                        <ToggleRow
                            label="Slack notifications"
                            description="Post pipeline events to your Slack channel."
                            checked={notif.slackWebhook}
                            onChange={v => setNotif(n => ({ ...n, slackWebhook: v }))}
                        />
                    </div>
                    <div className="pt-3">
                        <ToggleRow
                            label="AI summary digest"
                            description="Receive a daily AI-generated summary of your pipeline health."
                            checked={notif.aiSummary}
                            onChange={v => setNotif(n => ({ ...n, aiSummary: v }))}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                    <SavedToast show={savedNotif} />
                    <button className="btn-primary btn-sm ml-auto" onClick={saveNotif}>
                        <Check size={13} /> Save preferences
                    </button>
                </div>
            </Section>

            {/* ── Security ──────────────────────────────────────────────────────── */}
            <Section title="Security" description="OAuth session and authentication information.">
                <InfoRow label="Auth method" value="GitHub OAuth 2.0" />
                <InfoRow label="Session" value="Active" />
                <InfoRow label="Scope" value="read:user, repo (public)" />
                <InfoRow label="Token storage" value="HTTP-only cookie (Spring Security)" />

                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400">
                    <Shield size={14} className="flex-shrink-0" />
                    Your GitHub token is stored server-side only. No credentials are ever exposed to the browser.
                </div>
            </Section>

            {/* ── About ─────────────────────────────────────────────────────────── */}
            <Section title="About PipelineIQ" description="Stack and version information.">
                <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                        ['Frontend', 'React 18 + Vite + Tailwind'],
                        ['Backend', 'Spring Boot 3 (Java)'],
                        ['Database', 'PostgreSQL + JPA'],
                        ['Auth', 'Spring Security OAuth2'],
                        ['AI Engine', 'OpenAI / Custom LLM'],
                        ['Container', 'Docker + Docker Compose'],
                    ].map(([k, v]) => (
                        <div key={k} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <p className="text-gray-400 mb-0.5">{k}</p>
                            <p className="font-medium text-gray-800 dark:text-gray-200">{v}</p>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-gray-400 text-center pt-1">
                    PipelineIQ · Personal Project · Phase 1 — Dashboard
                </p>
            </Section>

            {/* ── Danger zone ───────────────────────────────────────────────────── */}
            <Section title="Session" description="Sign out or clear local data.">
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={logout} className="btn-danger btn-sm">
                        <LogOut size={14} /> Sign out
                    </button>
                    {!danger ? (
                        <button
                            onClick={() => setDanger(true)}
                            className="btn-ghost btn-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            <Trash2 size={14} /> Clear local preferences
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 animate-fade-in">
                            <p className="text-xs text-gray-500">Are you sure?</p>
                            <button
                                className="btn-danger btn-sm"
                                onClick={() => {
                                    localStorage.clear()
                                    setDanger(false)
                                    window.location.reload()
                                }}
                            >
                                Yes, clear
                            </button>
                            <button className="btn-secondary btn-sm" onClick={() => setDanger(false)}>
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </Section>

        </div>
    )
}