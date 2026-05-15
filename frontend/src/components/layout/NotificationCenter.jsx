import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Bell, X, CheckCheck, AlertTriangle, CheckCircle2, Info, Zap } from 'lucide-react'
import { usePolling } from '@/hooks/usePolling'
import api from '@/api/client'

// ── Notification type config ──────────────────────────────────────────────────
const TYPE_CFG = {
    failure: {
        icon: AlertTriangle,
        dot: 'bg-red-500',
        ring: 'ring-red-200 dark:ring-red-900',
        label: 'text-red-600 dark:text-red-400',
    },
    success: {
        icon: CheckCircle2,
        dot: 'bg-emerald-500',
        ring: 'ring-emerald-200 dark:ring-emerald-900',
        label: 'text-emerald-600 dark:text-emerald-400',
    },
    warning: {
        icon: AlertTriangle,
        dot: 'bg-amber-500',
        ring: 'ring-amber-200 dark:ring-amber-900',
        label: 'text-amber-600 dark:text-amber-400',
    },
    ai: {
        icon: Zap,
        dot: 'bg-brand-500',
        ring: 'ring-brand-200 dark:ring-brand-900',
        label: 'text-brand-600 dark:text-brand-400',
    },
    info: {
        icon: Info,
        dot: 'bg-gray-400',
        ring: 'ring-gray-200 dark:ring-gray-700',
        label: 'text-gray-500',
    },
}

// ── Static fallback while backend not wired ───────────────────────────────────
const MOCK_NOTIFS = [
    { id: 1, type: 'failure', title: 'cicd-analyzer #141 failed', body: 'Test stage: NullPointerException', time: new Date(Date.now() - 45 * 60000), read: false, link: '/runs' },
    { id: 2, type: 'warning', title: 'Build time threshold exceeded', body: 'spring-api #58 took 8m 42s (threshold: 5m)', time: new Date(Date.now() - 2 * 3600000), read: false, link: '/runs' },
    { id: 3, type: 'success', title: 'spring-api #57 deployed', body: 'All 4 stages passed in 3m 21s', time: new Date(Date.now() - 3 * 3600000), read: true, link: '/runs' },
    { id: 4, type: 'ai', title: 'AI analysis ready — run #140', body: 'Root cause: flaky test in ServiceTest.java', time: new Date(Date.now() - 5 * 3600000), read: true, link: '/insights' },
    { id: 5, type: 'failure', title: 'docker-compose #11 cancelled', body: 'Cancelled by developer push event', time: new Date(Date.now() - 10 * 3600000), read: true, link: '/runs' },
]

function fmtTime(date) {
    const diff = Date.now() - new Date(date).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
}

// ── Single notification item ──────────────────────────────────────────────────
function NotifItem({ notif, onRead, onClose }) {
    const cfg = TYPE_CFG[notif.type] ?? TYPE_CFG.info
    const Icon = cfg.icon

    return (
        <li
            className={`
        flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
        hover:bg-gray-50 dark:hover:bg-gray-800/60
        ${!notif.read ? 'bg-brand-50/40 dark:bg-brand-900/10' : ''}
      `}
            onClick={() => onRead(notif.id)}
        >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ring-2 ${cfg.ring}`}>
                <Icon size={13} className={cfg.label} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs font-semibold leading-tight ${!notif.read ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                        {notif.title}
                    </p>
                    {!notif.read && (
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${cfg.dot}`} />
                    )}
                </div>
                {notif.body && (
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{notif.body}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-400">{fmtTime(notif.time)}</span>
                    {notif.link && (
                        <Link
                            to={notif.link}
                            className="text-[10px] text-brand-500 hover:underline"
                            onClick={onClose}
                        >
                            View →
                        </Link>
                    )}
                </div>
            </div>
        </li>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main component — drop this into TopBar in place of the old bell button
// ═══════════════════════════════════════════════════════════════════════════════
export function NotificationCenter() {
    const [open, setOpen] = useState(false)
    const [notifs, setNotifs] = useState(MOCK_NOTIFS)
    const ref = useRef(null)

    const unread = notifs.filter(n => !n.read).length

    // Fetch from backend
    const fetchNotifs = useCallback(() => {
        api.get('/notifications').then(res => {
            if (Array.isArray(res.data) && res.data.length) setNotifs(res.data)
        }).catch(() => { /* keep mock */ })
    }, [])

    useEffect(() => { fetchNotifs() }, [fetchNotifs])
    usePolling(fetchNotifs, 30_000)

    // Close on outside click
    useEffect(() => {
        const handler = e => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const markRead = id => {
        setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n))
        api.post(`/notifications/${id}/read`).catch(() => { })
    }

    const markAllRead = () => {
        setNotifs(ns => ns.map(n => ({ ...n, read: true })))
        api.post('/notifications/read-all').catch(() => { })
    }

    return (
        <div ref={ref} className="relative">
            {/* Bell button */}
            <button
                onClick={() => setOpen(o => !o)}
                className="btn-ghost p-2 rounded-lg relative"
                title="Notifications"
            >
                <Bell size={17} />
                {unread > 0 && (
                    <span className="
            absolute -top-0.5 -right-0.5
            min-w-[16px] h-4 px-0.5
            rounded-full bg-red-500 text-white
            text-[9px] font-bold flex items-center justify-center
            ring-2 ring-white dark:ring-gray-900
          ">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="
          absolute right-0 top-full mt-2 w-80
          card shadow-2xl z-50 animate-slide-up
          max-h-[480px] flex flex-col overflow-hidden
        ">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</p>
                            {unread > 0 && (
                                <span className="badge-danger text-[10px] px-1.5 py-0.5">{unread} new</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unread > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="btn-ghost p-1 rounded-md text-xs flex items-center gap-1 text-gray-400 hover:text-brand-500"
                                    title="Mark all read"
                                >
                                    <CheckCheck size={13} />
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="btn-ghost p-1 rounded-md text-gray-400 hover:text-gray-600"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <ul className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                        {notifs.length === 0 && (
                            <li className="flex flex-col items-center py-10 text-center">
                                <Bell size={24} className="text-gray-300 dark:text-gray-700 mb-2" />
                                <p className="text-sm text-gray-400">No notifications yet</p>
                            </li>
                        )}
                        {notifs.map(n => (
                            <NotifItem
                                key={n.id}
                                notif={n}
                                onRead={markRead}
                                onClose={() => setOpen(false)}
                            />
                        ))}
                    </ul>

                    {/* Footer */}
                    <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
                        <Link
                            to="/settings"
                            className="text-xs text-brand-500 hover:underline"
                            onClick={() => setOpen(false)}
                        >
                            Manage notification settings →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}