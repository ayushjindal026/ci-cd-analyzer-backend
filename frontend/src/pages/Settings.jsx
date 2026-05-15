import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useSettings } from '@/hooks/useSettings'
import { useToast } from '@/components/ui/Toast'
import { settingsApi } from '@/api/settingsApi'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorBanner } from '@/components/ui'
import {
    Github, Moon, Sun, Bell, Shield, LogOut,
    ExternalLink, Check, Globe, Webhook,
    Mail, Trash2, AlertCircle, RefreshCw,
} from 'lucide-react'

// ── Reusable section ──────────────────────────────────────────────────────────
function Section({ title, description, badge, children }) {
    return (
        <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{title}</h3>
                    {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
                </div>
                {badge}
            </div>
            <div className="px-6 py-5 space-y-4">{children}</div>
        </div>
    )
}

// ── Toggle row ────────────────────────────────────────────────────────────────
function ToggleRow({ label, description, checked, onChange, disabled = false }) {
    return (
        <div className="flex items-center justify-between py-0.5">
            <div className="min-w-0 pr-4">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
            </div>
            <button
                role="switch" aria-checked={checked} disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`
          relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full
          transition-colors duration-200 focus:outline-none focus:ring-2
          focus:ring-brand-500 focus:ring-offset-2
          disabled:opacity-40 disabled:cursor-not-allowed
          ${checked ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'}
        `}
            >
                <span className={`
          inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm
          transition-transform duration-200
          ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}
        `} />
            </button>
        </div>
    )
}

// ── Info row ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
    return (
        <div className="flex items-center justify-between text-sm py-0.5">
            <span className="text-gray-500 dark:text-gray-400">{label}</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{value}</span>
        </div>
    )
}

// ── Save button strip ─────────────────────────────────────────────────────────
function SaveStrip({ onSave, saving, dirty }) {
    return (
        <div className="flex items-center justify-between pt-2">
            {dirty
                ? <p className="text-xs text-amber-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Unsaved changes
                </p>
                : <span />}
            <button className="btn-primary btn-sm" onClick={onSave} disabled={saving || !dirty}>
                {saving ? <><Spinner size="sm" /> Saving…</> : <><Check size={13} /> Save</>}
            </button>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Settings() {
    const { user, logout } = useAuth()
    const { dark, toggle } = useTheme()
    const { toast } = useToast()
    const { prefs, update, save, reset, loading, saving, dirty, error } = useSettings()

    const [testingSlack, setTestingSlack] = useState(false)
    const [testingEmail, setTestingEmail] = useState(false)
    const [dangerOpen, setDangerOpen] = useState(false)

    const handleSave = async () => {
        try {
            await save()
            toast.success('Settings saved', 'Your preferences have been updated.')
        } catch {
            toast.error('Save failed', 'Could not reach server — saved locally instead.')
        }
    }

    const handleSlackTest = async () => {
        if (!prefs.slackWebhookUrl.trim()) {
            toast.warning('No webhook URL', 'Paste your Slack incoming webhook URL first.')
            return
        }
        setTestingSlack(true)
        try {
            await settingsApi.testSlack(prefs.slackWebhookUrl)
            toast.success('Slack test sent!', 'Check your Slack channel for the test message.')
        } catch (e) {
            toast.error('Slack test failed', e.response?.data?.message ?? 'Could not reach webhook.')
        } finally { setTestingSlack(false) }
    }

    const handleEmailTest = async () => {
        if (!prefs.emailAddress.trim()) {
            toast.warning('No email', 'Enter your email address first.')
            return
        }
        setTestingEmail(true)
        try {
            await settingsApi.testEmail(prefs.emailAddress)
            toast.success('Test email sent!', `Check ${prefs.emailAddress} for the test message.`)
        } catch (e) {
            toast.error('Email test failed', e.response?.data?.message ?? 'Could not send test email.')
        } finally { setTestingEmail(false) }
    }

    const handleClearData = () => {
        reset()
        localStorage.clear()
        setDangerOpen(false)
        toast.info('Cleared', 'Local data and preferences cleared.')
        setTimeout(() => window.location.reload(), 800)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Spinner size="lg" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl space-y-5 animate-fade-in">

            {error && <ErrorBanner message={error} />}

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
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.login ?? 'U')}&background=4f46e5&color=fff&size=80`
                            }
                            alt={user.login}
                            onError={e => { e.target.src = `https://ui-avatars.com/api/?name=U&background=4f46e5&color=fff` }}
                            className="w-14 h-14 rounded-full ring-2 ring-brand-200 dark:ring-brand-800 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{user.name ?? user.login}</p>
                            <p className="text-sm text-gray-500">@{user.login}</p>
                            {user.email && <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>}
                        </div>
                        <a
                            href={`https://github.com/${user.login}`}
                            target="_blank" rel="noreferrer"
                            className="btn-secondary btn-sm flex-shrink-0"
                        >
                            <Globe size={13} /> Profile <ExternalLink size={10} />
                        </a>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <AlertCircle size={14} />
                        Not authenticated.{' '}
                        <a href="http://localhost:8081/api/v1/auth/github/login" className="text-brand-500 hover:underline">
                            Sign in with GitHub
                        </a>
                    </div>
                )}
            </Section>

            {/* ── Appearance ────────────────────────────────────────────────────── */}
            <Section title="Appearance" description="Dashboard theme and display preferences.">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${dark ? 'bg-brand-900/30 text-brand-400' : 'bg-amber-100 text-amber-500'}`}>
                            {dark ? <Moon size={16} /> : <Sun size={16} />}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                {dark ? 'Dark mode' : 'Light mode'}
                            </p>
                            <p className="text-xs text-gray-400">Persisted to your browser</p>
                        </div>
                    </div>
                    <button onClick={toggle} className="btn-secondary btn-sm">
                        Switch to {dark ? 'Light' : 'Dark'}
                    </button>
                </div>
                <div className="divider" />
                <ToggleRow
                    label="Compact mode"
                    description="Reduce table row height and card padding."
                    checked={prefs.compactMode}
                    onChange={v => update({ compactMode: v })}
                />
                <SaveStrip onSave={handleSave} saving={saving} dirty={dirty} />
            </Section>

            {/* ── Alert thresholds ──────────────────────────────────────────────── */}
            <Section
                title="Alert Thresholds"
                description="Configure when PipelineIQ fires alerts based on pipeline health metrics."
            >
                {/* Failure rate */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="label mb-0">Failure rate threshold</label>
                        <span className="font-mono text-sm font-bold text-brand-600 dark:text-brand-400">
                            {prefs.failureRateThreshold}%
                        </span>
                    </div>
                    <input
                        type="range" min={5} max={80} step={5}
                        value={prefs.failureRateThreshold}
                        onChange={e => update({ failureRateThreshold: +e.target.value })}
                        className="w-full accent-brand-600"
                    />
                    <p className="text-xs text-gray-400">
                        Alert fires when failure rate exceeds this over any 24-hour window.
                    </p>
                </div>

                {/* Build time */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="label mb-0">Build time threshold</label>
                        <span className="font-mono text-sm font-bold text-brand-600 dark:text-brand-400">
                            {prefs.buildTimeThreshold >= 60
                                ? `${Math.floor(prefs.buildTimeThreshold / 60)}m ${prefs.buildTimeThreshold % 60}s`
                                : `${prefs.buildTimeThreshold}s`}
                        </span>
                    </div>
                    <input
                        type="range" min={60} max={1800} step={60}
                        value={prefs.buildTimeThreshold}
                        onChange={e => update({ buildTimeThreshold: +e.target.value })}
                        className="w-full accent-brand-600"
                    />
                    <p className="text-xs text-gray-400">
                        Alert when any single stage exceeds this duration.
                    </p>
                </div>

                {/* Cooldown */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="label mb-0">Alert cooldown</label>
                        <span className="font-mono text-sm font-bold text-brand-600 dark:text-brand-400">
                            {prefs.alertCooldown}m
                        </span>
                    </div>
                    <input
                        type="range" min={5} max={120} step={5}
                        value={prefs.alertCooldown}
                        onChange={e => update({ alertCooldown: +e.target.value })}
                        className="w-full accent-brand-600"
                    />
                    <p className="text-xs text-gray-400">
                        Minimum time between repeated alerts for the same issue.
                    </p>
                </div>

                <SaveStrip onSave={handleSave} saving={saving} dirty={dirty} />
            </Section>

            {/* ── Notification channels ──────────────────────────────────────────── */}
            <Section
                title="Notification Channels"
                description="Choose where PipelineIQ sends alerts when thresholds are crossed."
            >
                {/* Email */}
                <div className="space-y-2">
                    <ToggleRow
                        label="Email notifications"
                        description="Send alerts to an email address."
                        checked={prefs.emailOnFailure}
                        onChange={v => update({ emailOnFailure: v })}
                    />
                    {prefs.emailOnFailure && (
                        <div className="flex gap-2 animate-slide-up">
                            <input
                                className="input text-sm flex-1"
                                type="email"
                                placeholder="you@example.com"
                                value={prefs.emailAddress}
                                onChange={e => update({ emailAddress: e.target.value })}
                            />
                            <button
                                className="btn-secondary btn-sm flex-shrink-0"
                                onClick={handleEmailTest}
                                disabled={testingEmail}
                            >
                                {testingEmail ? <><Spinner size="sm" /> Testing…</> : <><Mail size={13} /> Test</>}
                            </button>
                        </div>
                    )}
                </div>

                <div className="divider" />

                {/* Slack */}
                <div className="space-y-2">
                    <ToggleRow
                        label="Slack notifications"
                        description="Post pipeline events to a Slack channel via incoming webhook."
                        checked={prefs.slackEnabled}
                        onChange={v => update({ slackEnabled: v })}
                    />
                    {prefs.slackEnabled && (
                        <div className="space-y-2 animate-slide-up">
                            <div className="flex gap-2">
                                <input
                                    className="input text-sm flex-1"
                                    placeholder="https://hooks.slack.com/services/…"
                                    value={prefs.slackWebhookUrl}
                                    onChange={e => update({ slackWebhookUrl: e.target.value })}
                                />
                                <button
                                    className="btn-secondary btn-sm flex-shrink-0"
                                    onClick={handleSlackTest}
                                    disabled={testingSlack}
                                >
                                    {testingSlack ? <><Spinner size="sm" /> Testing…</> : <><Webhook size={13} /> Test</>}
                                </button>
                            </div>
                            <p className="text-xs text-gray-400">
                                Create a webhook at{' '}
                                <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noreferrer"
                                    className="text-brand-500 hover:underline">
                                    api.slack.com/messaging/webhooks
                                </a>
                            </p>
                        </div>
                    )}
                </div>

                <div className="divider" />

                {/* Preferences */}
                <div className="space-y-3">
                    <ToggleRow
                        label="Failure alerts only"
                        description="Skip success notifications — only alert on failures and recoveries."
                        checked={prefs.failureOnly}
                        onChange={v => update({ failureOnly: v })}
                    />
                    <ToggleRow
                        label="Email on recovery"
                        description="Notify when a previously failing pipeline passes again."
                        checked={prefs.emailOnRecovery}
                        onChange={v => update({ emailOnRecovery: v })}
                    />
                    <ToggleRow
                        label="Daily AI digest"
                        description="Receive a daily AI-generated summary of your pipeline health."
                        checked={prefs.aiDigest}
                        onChange={v => update({ aiDigest: v })}
                    />
                </div>

                <SaveStrip onSave={handleSave} saving={saving} dirty={dirty} />
            </Section>

            {/* ── Security ──────────────────────────────────────────────────────── */}
            <Section title="Security" description="Session and authentication details.">
                <InfoRow label="Auth method" value="GitHub OAuth 2.0" />
                <InfoRow label="Session" value="Active" />
                <InfoRow label="Token storage" value="JWT in localStorage" />
                <InfoRow label="Scopes" value="read:user, public_repo" />
                <div className="flex items-start gap-2 p-3 rounded-xl
             bg-emerald-50 dark:bg-emerald-900/20
             border border-emerald-200 dark:border-emerald-800 text-xs
             text-emerald-700 dark:text-emerald-400">
                    <Shield size={14} className="flex-shrink-0 mt-0.5" />
                    Your source code is never read or stored. Only repository metadata and
                    pipeline run results are persisted.
                </div>
            </Section>

            {/* ── Stack info ────────────────────────────────────────────────────── */}
            <Section title="About PipelineIQ" description="Stack and build information.">
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                    {[
                        ['Frontend', 'React 18 + Vite + Tailwind'],
                        ['Backend', 'Spring Boot 3 (Java)'],
                        ['Database', 'PostgreSQL + JPA'],
                        ['Auth', 'Spring Security + JWT'],
                        ['AI Engine', 'OpenAI GPT-4o'],
                        ['Container', 'Docker + Nginx'],
                    ].map(([k, v]) => (
                        <div key={k} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3">
                            <p className="text-gray-400 mb-0.5">{k}</p>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{v}</p>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-center text-gray-400 pt-1">
                    PipelineIQ · Personal Project · Phase 1 complete ✅
                </p>
            </Section>

            {/* ── Session / Danger ──────────────────────────────────────────────── */}
            <Section title="Session & Data" description="Sign out or clear all local data.">
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={logout} className="btn-danger btn-sm">
                        <LogOut size={14} /> Sign out
                    </button>

                    {!dangerOpen ? (
                        <button
                            onClick={() => setDangerOpen(true)}
                            className="btn-ghost btn-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            <Trash2 size={14} /> Clear all local data
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20
                            border border-red-200 dark:border-red-800 animate-fade-in">
                            <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                                This clears all local preferences. Cannot be undone.
                            </p>
                            <button className="btn-danger btn-sm text-xs" onClick={handleClearData}>
                                Confirm clear
                            </button>
                            <button className="btn-ghost btn-sm text-xs" onClick={() => setDangerOpen(false)}>
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </Section>

        </div>
    )
}