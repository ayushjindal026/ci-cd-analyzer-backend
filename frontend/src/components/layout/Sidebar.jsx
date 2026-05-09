// ─── src/components/layout/Sidebar.jsx ───────────────────────────────────────
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
    LayoutDashboard,
    GitBranch,
    Play,
    Sparkles,
    Settings,
    LogOut,
    ChevronRight,
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

    return (
        <aside className={`
      h-full flex flex-col bg-white dark:bg-gray-900
      border-r border-gray-200 dark:border-gray-800
      transition-all duration-200 ease-in-out
      ${collapsed ? 'w-16' : 'w-56'}
    `}>
            {/* Logo */}
            <div className={`flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-800 ${collapsed ? 'justify-center' : 'gap-3'}`}>
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                    <GitBranch size={16} className="text-white" />
                </div>
                {!collapsed && <span className="font-bold text-gray-900 dark:text-white text-sm">PipelineIQ</span>}
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {NAV.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
                        }
                        title={collapsed ? label : undefined}
                    >
                        <Icon size={18} className="flex-shrink-0" />
                        {!collapsed && <span>{label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* User footer */}
            <div className={`p-3 border-t border-gray-200 dark:border-gray-800 space-y-1`}>
                {user && (
                    <div className={`flex items-center gap-2 px-2 py-1.5 ${collapsed ? 'justify-center' : ''}`}>
                        <img
                            src={user.avatarUrl ?? `https://ui-avatars.com/api/?name=${user.login}&background=4f46e5&color=fff`}
                            alt={user.login}
                            className="w-7 h-7 rounded-full flex-shrink-0"
                        />
                        {!collapsed && (
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{user.login}</p>
                                <p className="text-xs text-gray-400 truncate">{user.email ?? 'GitHub'}</p>
                            </div>
                        )}
                    </div>
                )}
                <button
                    onClick={logout}
                    className={`nav-item w-full ${collapsed ? 'justify-center px-0' : ''}`}
                    title={collapsed ? 'Sign out' : undefined}
                >
                    <LogOut size={16} className="flex-shrink-0 text-gray-400" />
                    {!collapsed && <span className="text-gray-500">Sign out</span>}
                </button>
            </div>

            {/* Collapse toggle */}
            <button
                onClick={onToggle}
                className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white dark:bg-gray-800
                   border border-gray-200 dark:border-gray-700 flex items-center justify-center
                   shadow-sm hover:shadow-md transition-shadow z-10"
            >
                <ChevronRight size={12} className={`text-gray-500 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
            </button>
        </aside>
    )
}