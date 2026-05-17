import { useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import {
    LayoutDashboard, GitBranch, Play, Sparkles,
    Activity, ChevronRight, Moon, Sun, Bell, X,
    FlaskConical, LogIn, CheckCheck,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useDemo } from '@/demo/DemoContext'

const NAV = [
    { to: '/demo', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/demo/repos', icon: GitBranch, label: 'Repositories' },
    { to: '/demo/runs', icon: Play, label: 'Pipeline Runs' },
    { to: '/demo/insights', icon: Sparkles, label: 'AI Insights' },
]

// ── Demo sidebar ──────────────────────────────────────────────────────────────
function DemoSidebar({ collapsed, onToggle }) {
    return (
        <aside className={`
      relative h-full flex flex-col select-none
      bg-white dark:bg-gray-900
      border-r border-gray-200 dark:border-gray-800
      transition-all duration-200
      ${collapsed ? 'w-16' : 'w-56'}
    `}>

            {/* Logo + demo badge */}
            <div className={`flex items-center h-16 flex-shrink-0
                       border-b border-gray-200 dark:border-gray-800
                       ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-4'}`}>
                <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
                    <Activity size={16} className="text-white" />
                </div>
                {!collapsed && (
                    <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-sm leading-none">PipelineIQ</p>
                        <div className="flex items-center gap-1 mt-0.5">
                            <FlaskConical size={9} className="text-amber-400" />
                            <p className="text-[10px] text-amber-500 font-medium">Demo Mode</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
                {NAV.map(({ to, icon: Icon, label, end }) => (
                    <NavLink
                        key={to} to={to} end={end}
                        title={collapsed ? label : undefined}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
                        }
                    >
                        <Icon size={17} className="flex-shrink-0" />
                        {!collapsed && <span className="truncate">{label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Sign up CTA */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
                <Link
                    to="/login"
                    title={collapsed ? 'Sign in' : undefined}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg
                      bg-brand-600 text-white text-xs font-semibold
                      hover:bg-brand-700 transition-colors
                      ${collapsed ? 'justify-center' : ''}`}
                >
                    <LogIn size={14} className="flex-shrink-0" />
                    {!collapsed && 'Connect real repos'}
                </Link>
            </div>

            {/* Collapse toggle */}
            <button
                onClick={onToggle}
                className="absolute -right-3 top-[4.75rem] z-20 w-6 h-6 rounded-full
                   flex items-center justify-center
                   bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                   shadow-sm hover:shadow-md transition-all"
            >
                <ChevronRight size={12} className={`text-gray-500 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
            </button>
        </aside>
    )
}

// ── Demo notification dropdown ────────────────────────────────────────────────
function DemoNotifButton() {
    const { notifications, unreadCount, markNotifRead, markAllRead } = useDemo()
    const [open, setOpen] = useState(false)

    const TYPE_DOT = {
        failure: 'bg-red-500',
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        ai: 'bg-brand-500',
        info: 'bg-gray-400',
    }

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="btn-ghost p-2 rounded-lg relative"
            >
                <Bell size={17} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5
                           rounded-full bg-red-500 text-white text-[9px] font-bold
                           flex items-center justify-center
                           ring-2 ring-white dark:ring-gray-900">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 card shadow-2xl z-50 animate-slide-up max-h-96 flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</p>
                            {unreadCount > 0 && <span className="badge-danger text-[10px] px-1.5">{unreadCount} new</span>}
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button onClick={markAllRead} className="btn-ghost p-1 rounded-md" title="Mark all read">
                                    <CheckCheck size={13} className="text-gray-400" />
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="btn-ghost p-1 rounded-md">
                                <X size={14} className="text-gray-400" />
                            </button>
                        </div>
                    </div>

                    <ul className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                        {notifications.map(n => (
                            <li
                                key={n.id}
                                onClick={() => markNotifRead(n.id)}
                                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
                            hover:bg-gray-50 dark:hover:bg-gray-800
                            ${!n.read ? 'bg-brand-50/40 dark:bg-brand-900/10' : ''}`}
                            >
                                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${TYPE_DOT[n.type] ?? 'bg-gray-400'}`} />
                                <div className="min-w-0">
                                    <p className={`text-xs font-semibold leading-tight ${!n.read ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'}`}>
                                        {n.title}
                                    </p>
                                    {n.body && <p className="text-[11px] text-gray-400 mt-0.5">{n.body}</p>}
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        {new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
                        <p className="text-[11px] text-gray-500 text-center">Demo notifications — simulated</p>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Demo topbar ───────────────────────────────────────────────────────────────
const PAGE_TITLES = {
    '/demo': 'Dashboard',
    '/demo/repos': 'Repositories',
    '/demo/runs': 'Pipeline Runs',
    '/demo/insights': 'AI Insights',
}

function DemoTopBar() {
    const { dark, toggle } = useTheme()
    const { pathname } = useLocation()
    const title = PAGE_TITLES[pathname] ?? 'Demo'

    return (
        <header className="h-16 flex items-center justify-between px-6 flex-shrink-0
                       bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <h1 className="font-semibold text-gray-900 dark:text-gray-100 text-base">{title}</h1>

            <div className="flex items-center gap-1.5">
                <Link
                    to="/login"
                    className="btn-primary btn-sm mr-2 hidden sm:inline-flex"
                >
                    <LogIn size={13} /> Sign in with GitHub
                </Link>

                <button onClick={toggle} className="btn-ghost p-2 rounded-lg">
                    {dark ? <Sun size={17} /> : <Moon size={17} />}
                </button>

                <DemoNotifButton />
            </div>
        </header>
    )
}

// ── Demo layout shell ─────────────────────────────────────────────────────────
export function DemoLayout() {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
            <div className="relative flex-shrink-0 z-10">
                <DemoSidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
            </div>
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <DemoTopBar />
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}