import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, Moon, Sun, X, Play, GitBranch, LayoutDashboard, Sparkles, Settings } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { NotificationCenter } from './NotificationCenter'

export const PAGE_TITLES = {
  '/': 'Dashboard',
  '/repos': 'Repositories',
  '/runs': 'Pipeline Runs',
  '/insights': 'AI Insights',
  '/settings': 'Settings',
}

const SEARCH_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Repositories', path: '/repos', icon: GitBranch },
  { label: 'Pipeline Runs', path: '/runs', icon: Play },
  { label: 'AI Insights', path: '/insights', icon: Sparkles },
  { label: 'Settings', path: '/settings', icon: Settings },
]

export function TopBar() {
  const { dark, toggle } = useTheme()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const searchRef = useRef(null)
  const title = PAGE_TITLES[pathname] ?? 'PipelineIQ'

  const results = query.trim()
    ? SEARCH_ITEMS.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : []

  // Close search dropdown on outside click
  useEffect(() => {
    const h = e => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const pick = path => { navigate(path); setQuery(''); setOpen(false) }

  return (
    <header className="
      h-16 flex items-center justify-between px-6 flex-shrink-0
      bg-white dark:bg-gray-900
      border-b border-gray-200 dark:border-gray-800
      z-10
    ">
      <h1 className="font-semibold text-gray-900 dark:text-gray-100 text-base">{title}</h1>

      <div className="flex items-center gap-1.5">

        {/* Global search */}
        <div ref={searchRef} className="relative hidden md:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="input pl-8 w-44 h-9 text-sm focus:w-60 transition-all duration-200"
            placeholder="Search pages…"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => query && setOpen(true)}
            onKeyDown={e => {
              if (e.key === 'Escape') { setQuery(''); setOpen(false) }
              if (e.key === 'Enter' && results.length) pick(results[0].path)
            }}
          />
          {query && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={() => { setQuery(''); setOpen(false) }}
            >
              <X size={13} />
            </button>
          )}
          {open && results.length > 0 && (
            <div className="absolute top-full mt-1.5 w-60 card shadow-lg z-50 py-1 animate-slide-up">
              {results.map(r => (
                <button
                  key={r.path}
                  onClick={() => pick(r.path)}
                  className="
                    w-full flex items-center gap-2.5 px-3 py-2.5
                    text-sm text-gray-700 dark:text-gray-200
                    hover:bg-gray-50 dark:hover:bg-gray-800
                    text-left transition-colors
                  "
                >
                  <r.icon size={14} className="text-gray-400 flex-shrink-0" />
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="btn-ghost p-2 rounded-lg"
        >
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notification center */}
        <NotificationCenter />
      </div>
    </header>
  )
}