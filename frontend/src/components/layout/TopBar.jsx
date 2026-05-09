// ═══════════════════════════════════════════════════════════════════════════════
// src/components/layout/TopBar.jsx
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate }    from 'react-router-dom'
import { Search, Bell, Moon, Sun, X, Play, GitBranch, LayoutDashboard, Sparkles, Settings } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export const PAGE_TITLES = {
  '/':         'Dashboard',
  '/repos':    'Repositories',
  '/runs':     'Pipeline Runs',
  '/insights': 'AI Insights',
  '/settings': 'Settings',
}

const SEARCH_ITEMS = [
  { label: 'Dashboard',     path: '/',         icon: LayoutDashboard },
  { label: 'Repositories',  path: '/repos',    icon: GitBranch       },
  { label: 'Pipeline Runs', path: '/runs',     icon: Play            },
  { label: 'AI Insights',   path: '/insights', icon: Sparkles        },
  { label: 'Settings',      path: '/settings', icon: Settings        },
]

const NOTIFS = [
  { dot: 'bg-red-500',     text: 'cicd-analyzer #141 failed — Test stage',  time: '45m ago' },
  { dot: 'bg-amber-500',   text: 'Build time up 40% (7-day trend)',          time: '2h ago'  },
  { dot: 'bg-emerald-500', text: 'spring-api #57 deployed successfully',     time: '3h ago'  },
  { dot: 'bg-brand-500',   text: 'AI analysis complete for run #140',        time: '5h ago'  },
]

export function TopBar() {
  const { dark, toggle }          = useTheme()
  const { pathname }              = useLocation()
  const navigate                  = useNavigate()
  const [query,      setQuery]    = useState('')
  const [searchOpen, setSearch]   = useState(false)
  const [notifOpen,  setNotif]    = useState(false)
  const searchRef                 = useRef(null)
  const notifRef                  = useRef(null)
  const title                     = PAGE_TITLES[pathname] ?? 'PipelineIQ'

  const results = query.trim()
    ? SEARCH_ITEMS.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : []

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = e => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearch(false)
      if (notifRef.current  && !notifRef.current.contains(e.target))  setNotif(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pick = path => { navigate(path); setQuery(''); setSearch(false) }

  return (
    <header className="
      h-16 flex items-center justify-between px-6 flex-shrink-0
      bg-white dark:bg-gray-900
      border-b border-gray-200 dark:border-gray-800
    ">
      <h1 className="font-semibold text-gray-900 dark:text-gray-100 text-base">{title}</h1>

      <div className="flex items-center gap-1.5">

        {/* Search */}
        <div ref={searchRef} className="relative hidden md:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="input pl-8 w-44 h-9 text-sm focus:w-60 transition-all duration-200"
            placeholder="Search…"
            value={query}
            onChange={e => { setQuery(e.target.value); setSearch(true) }}
            onFocus={() => setSearch(true)}
          />
          {query && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => { setQuery(''); setSearch(false) }}
            >
              <X size={13} />
            </button>
          )}
          {searchOpen && results.length > 0 && (
            <div className="absolute top-full mt-1 w-60 card shadow-lg z-50 py-1 animate-slide-up">
              {results.map(r => (
                <button
                  key={r.path}
                  onClick={() => pick(r.path)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
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
          title={dark ? 'Light mode' : 'Dark mode'}
          className="btn-ghost p-2 rounded-lg"
        >
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotif(o => !o)}
            className="btn-ghost p-2 rounded-lg relative"
            title="Notifications"
          >
            <Bell size={17} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 w-80 card shadow-xl z-50 animate-slide-up">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</p>
                <button onClick={() => setNotif(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X size={14} />
                </button>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800 max-h-72 overflow-y-auto">
                {NOTIFS.map((n, i) => (
                  <li key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                    <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.dot}`} />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{n.text}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{n.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 text-center">
                <button
                  className="text-xs text-brand-500 hover:underline"
                  onClick={() => setNotif(false)}
                >
                  Mark all as read
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}