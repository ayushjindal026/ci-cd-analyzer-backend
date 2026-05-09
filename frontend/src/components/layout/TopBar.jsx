// ─── src/components/layout/TopBar.jsx ────────────────────────────────────────
import { useState } from 'react'
import { Search, Bell, Moon, Sun, RefreshCw } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export function TopBar({ title, actions }) {
    const { dark, toggle } = useTheme()
    const [query, setQuery] = useState('')

    return (
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <div className="flex items-center gap-4">
                <h1 className="section-title">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
                {/* Global search */}
                <div className="relative hidden md:block">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        className="input pl-9 w-52 h-9 text-sm"
                        placeholder="Search runs, repos…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </div>

                {actions}

                {/* Dark mode */}
                <button className="btn-ghost p-2" onClick={toggle} title="Toggle theme">
                    {dark ? <Sun size={17} /> : <Moon size={17} />}
                </button>

                {/* Notifications placeholder */}
                <button className="btn-ghost p-2 relative" title="Notifications">
                    <Bell size={17} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
                </button>
            </div>
        </header>
    )
}