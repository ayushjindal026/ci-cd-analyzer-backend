// ═══════════════════════════════════════════════════════════════════════════════
// src/components/runs/RunFilters.jsx
// Filter bar: repo selector + status pills + clear
// ═══════════════════════════════════════════════════════════════════════════════
import { Filter, X } from 'lucide-react'

const STATUS_OPTS = ['all', 'SUCCESS', 'FAILED', 'RUNNING', 'PENDING', 'CANCELLED']

export function RunFilters({ repos, selRepo, setSelRepo, status, setStatus, onClear, total, onRefresh, loading }) {
    const hasFilters = selRepo || status !== 'all'
    return (
        <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex flex-wrap items-center gap-2">
                <Filter size={14} className="text-gray-400 flex-shrink-0" />

                {repos.length > 0 && (
                    <select
                        className="input h-8 text-xs w-auto pr-8 min-w-[140px]"
                        value={selRepo}
                        onChange={e => setSelRepo(e.target.value)}
                    >
                        <option value="">All repositories</option>
                        {repos.map(r => (
                            <option key={r.id} value={r.id}>{r.fullName ?? r.name}</option>
                        ))}
                    </select>
                )}

                <div className="flex gap-1 flex-wrap">
                    {STATUS_OPTS.map(s => (
                        <button
                            key={s}
                            onClick={() => setStatus(s)}
                            className={`
                px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize
                ${status === s
                                    ? 'bg-brand-600 text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}
              `}
                        >
                            {s.toLowerCase()}
                        </button>
                    ))}
                </div>

                {hasFilters && (
                    <button
                        onClick={onClear}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X size={12} /> Clear
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{total} run{total !== 1 ? 's' : ''}</span>
                <button
                    className="btn-secondary btn-sm"
                    onClick={onRefresh}
                    disabled={loading}
                >
                    <span className={`inline-block ${loading ? 'animate-spin' : ''}`}>↻</span>
                    Refresh
                </button>
            </div>
        </div>
    )
}
