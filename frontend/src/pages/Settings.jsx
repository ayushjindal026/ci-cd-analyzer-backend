// ─── src/pages/Settings.jsx ───────────────────────────────────────────────────
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Globe, Moon, Sun, Bell, Shield, LogOut, ExternalLink, Check } from 'lucide-react'

function Section({ title, description, children }) {
    return (
        <div className="card p-6 space-y-4">
            <div className="pb-3 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
            </div>
            {children}
        </div>
    )
}

function Toggle({ checked, onChange, label, description }) {
    return (
        <div className="flex items-center justify-between py-1">
            <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                {description && <p className="text-xs text-gray-400">{description}</p>}
            </div>
            <button
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
          ${checked ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
            </button>
        </div>
    )
}

function SavedBadge({ show }) {
    if (!show) return null
    return (
        <span className="badge-success animate-fade-in">
            <Check size={11} /> Saved
        </span>
    )
}

export default function Settings() {
    const { user, logout } = useAuth()
    const { dark, toggle } = useTheme()

    const [notif, setNotif] = useState({ email: true, slack: false, failureOnly: true })
    const [saved, setSaved] = useState(false)

    const handleSave = () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    return (
        <div className="max-w-2xl space-y-5 animate-fade-in">

            {/* Profile */}
            <Section title="Profile" description="Your GitHub identity connected to PipelineIQ.">
                {user ? (
                    <div className="flex items-center gap-4">
                        <img
                            src={user.avatarUrl ?? `https://ui-avatars.com/api/?name=${user.login}&background=4f46e5&color=fff&size=64`}
                            alt={user.login}
                            className="w-14 h-14 rounded-full ring-2 ring-brand-200"
                        />
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{user.name ?? user.login}</p>
                            <p className="text-sm text-gray-500">@{user.login}</p>
                            {user.email && <p className="text-xs text-gray-400">{user.email}</p>}
                        </div>
                        <a
                            href={`https://github.com/${user.login}`}
                            target="_blank" rel="noreferrer"
                            className="ml-auto btn-secondary btn-sm"
                        >
                            <Globe size={13} /> GitHub <ExternalLink size={11} />
                        </a>
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">Not authenticated.</p>
                )}
            </Section>

            {/* Appearance */}
            <Section title="Appearance" description="Customize how the dashboard looks.">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {dark ? <Moon size={16} className="text-brand-400" /> : <Sun size={16} className="text-amber-400" />}
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {dark ? 'Dark mode' : 'Light mode'}
                        </p>
                    </div>
                    <button onClick={toggle} className="btn-secondary btn-sm">Switch to {dark ? 'Light' : 'Dark'}</button>
                </div>
            </Section>

            {/* Notifications */}
            <Section title="Notifications" description="Choose when and how you get alerted on pipeline events.">
                <Toggle
                    checked={notif.email}
                    onChange={v => setNotif(n => ({ ...n, email: v }))}
                    label="Email alerts"
                    description="Receive an email when a pipeline fails or recovers."
                />
                <Toggle
                    checked={notif.slack}
                    onChange={v => setNotif(n => ({ ...n, slack: v }))}
                    label="Slack notifications"
                    description="Post to a Slack channel (configure webhook in Phase 2)."
                />
                <Toggle
                    checked={notif.failureOnly}
                    onChange={v => setNotif(n => ({ ...n, failureOnly: v }))}
                    label="Failure alerts only"
                    description="Skip success notifications — only alert on failures."
                />
                <div className="flex items-center justify-between pt-2">
                    <SavedBadge show={saved} />
                    <button className="btn-primary btn-sm ml-auto" onClick={handleSave}>Save preferences</button>
                </div>
            </Section>

            {/* Security */}
            <Section title="Security" description="OAuth token and session management.">
                <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Shield size={15} className="text-emerald-500" />
                            Authentication method
                        </div>
                        <span className="badge-success">GitHub OAuth 2.0</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                        <p className="text-gray-500">Session</p>
                        <span className="badge-info">Active</span>
                    </div>
                </div>
            </Section>

            {/* Danger zone */}
            <Section title="Session" description="">
                <button
                    onClick={logout}
                    className="btn-danger btn-sm"
                >
                    <LogOut size={14} /> Sign out of PipelineIQ
                </button>
            </Section>

        </div>
    )
}