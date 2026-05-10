import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
    LayoutDashboard, GitBranch, Play, Sparkles,
    Settings, LogOut, ChevronRight, Activity,
} from 'lucide-react'

const NAV = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/repos', icon: GitBranch, label: 'Repositories' },
    { to: '/runs', icon: Play, label: 'Pipeline Runs' },
    { to: '/insights', icon: Sparkles, label: 'AI Insights' },
    { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar({ collapsed, onToggle }) {
    const { user, logout } = useAuth()

    // Build a safe avatar URL — handles all field names Spring might return
    const avatarUrl =
        user?.avatarUrl ??
        user?.avatar_url ??
        user?.githubAvatarUrl ??
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.login ?? user?.name ?? 'U')}&background=4f46e5&color=fff&bold=true`

    const displayName = user?.name ?? user?.login ?? 'User'
    const handle = user?.login ? `@${user.login}` : user?.email ?? 'GitHub'

    return (
        <aside className={`
      relative h-full flex flex-col select-none
      bg-white dark:bg-gray-900
      border-r border-gray-200 dark:border-gray-800
      transition-all duration-200 ease-in-out
      ${collapsed ? 'w-16' : 'w-56'}
    `}>

            {/* Logo */}
            <div className={`
        flex items-center h-16 flex-shrink-0
        border-b border-gray-200 dark:border-gray-800
        ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'}
      `}>
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-sm">
                    <Activity size={16} className="text-white" />
                </div>
                {!collapsed && (
                    <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-sm leading-none">PipelineIQ</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 tracking-wide">CI/CD Analyzer</p>
                    </div>
                )}
            </div>

            {/* Nav links */}
            <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
                {NAV.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
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

            {/* User + logout */}
            <div className="p-2 space-y-1 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
                {user && (
                    <div className={`flex items-center gap-2.5 px-2 py-2 rounded-lg ${collapsed ? 'justify-center' : ''}`}>
                        <img
                            src={avatarUrl}
                            alt={displayName}
                            onError={e => {
                                e.target.onerror = null
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff`
                            }}
                            className="w-7 h-7 rounded-full flex-shrink-0 ring-2 ring-brand-200 dark:ring-brand-800"
                        />
                        {!collapsed && (
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
                                    {displayName}
                                </p>
                                <p className="text-[10px] text-gray-400 truncate">{handle}</p>
                            </div>
                        )}
                    </div>
                )}

                <button
                    onClick={logout}
                    title={collapsed ? 'Sign out' : undefined}
                    className={`nav-item w-full hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 ${collapsed ? 'justify-center px-2' : ''}`}
                >
                    <LogOut size={15} className="flex-shrink-0 text-gray-400" />
                    {!collapsed && <span className="text-gray-500 dark:text-gray-400 text-xs">Sign out</span>}
                </button>
            </div>

            {/* Collapse toggle */}
            <button
                onClick={onToggle}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="
          absolute -right-3 top-[4.75rem] z-20
          w-6 h-6 rounded-full flex items-center justify-center
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          shadow-sm hover:shadow-md transition-all
        "
            >
                <ChevronRight
                    size={12}
                    className={`text-gray-500 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
                />
            </button>
        </aside>
    )
}