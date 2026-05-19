// ═══════════════════════════════════════════════════════════════════════════════
// src/components/pipelines/RepoTable.jsx
// Main repository table with health bars, actions, inline confirm-delete
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GitBranch, RefreshCw, Trash2, ArrowUpRight, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDistanceToNow } from 'date-fns'

const LANG_CLS = {
    Java: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    JavaScript: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    TypeScript: 'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300',
    Python: 'bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300',
    Dockerfile: 'bg-sky-100    text-sky-700    dark:bg-sky-900/40    dark:text-sky-300',
    Go: 'bg-cyan-100   text-cyan-700   dark:bg-cyan-900/40   dark:text-cyan-300',
    Kotlin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    Shell: 'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400',
}

function HealthBar({ rate = 0 }) {
    const [bar, text] =
        rate >= 85 ? ['bg-emerald-500', 'text-emerald-600 dark:text-emerald-400'] :
            rate >= 60 ? ['bg-amber-500', 'text-amber-600   dark:text-amber-400'] :
                ['bg-red-500', 'text-red-600     dark:text-red-400']
    return (
        <div className="min-w-[110px]">
            <p className={`text-sm font-bold mb-1 leading-none ${text}`}>{rate}%</p>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                <div className={`${bar} h-1.5 rounded-full transition-all duration-700`} style={{ width: `${Math.min(100, rate)}%` }} />
            </div>
        </div>
    )
}

function TableSkeleton() {
    return Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
            {[50, 18, 28, 14, 20, 16, 12].map((w, j) => (
                <td key={j}><div className="skeleton h-4 rounded" style={{ width: `${w + (i * 5 + j * 4) % 18}%` }} /></td>
            ))}
        </tr>
    ))
}

export function RepoTable({ repos, loading, onSync, onRemove, onAddClick }) {
    const [syncing, setSyncing] = useState(null)
    const [confirm, setConfirm] = useState(null)
    const [deleting, setDeleting] = useState(null)

    const handleSync = async id => {
        setSyncing(id)
        try { await onSync(id) } finally { setSyncing(null) }
    }

    const handleDelete = async id => {
        setDeleting(id); setConfirm(null)
        try { await onRemove(id) } finally { setDeleting(null) }
    }

    return (
        <div className="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Repository</th>
                        <th>Language</th>
                        <th>Health</th>
                        <th>Runs</th>
                        <th>Last run</th>
                        <th>Status</th>
                        <th className="text-right pr-4">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {loading && <TableSkeleton />}

                    {!loading && repos.length === 0 && (
                        <tr><td colSpan={7}>
                            <EmptyState
                                icon={GitBranch}
                                title="No repositories connected"
                                description="Add a GitHub repository to start analyzing your CI/CD pipelines."
                                action={
                                    <button className="btn-primary" onClick={onAddClick}>
                                        <span className="text-base leading-none">+</span> Add Repository
                                    </button>
                                }
                            />
                        </td></tr>
                    )}

                    {!loading && repos.map(repo => (
                        <tr key={repo.id} className={`${deleting === repo.id ? 'opacity-40 pointer-events-none' : ''}`}>

                            {/* Name */}
                            <td>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                        <GitBranch size={14} className="text-brand-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
                                            {repo.fullName ?? repo.name}
                                        </p>
                                        <a href={`https://github.com/${repo.fullName ?? repo.name}`}
                                            target="_blank" rel="noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            className="text-xs text-brand-500 hover:underline flex items-center gap-0.5">
                                            GitHub <ArrowUpRight size={10} />
                                        </a>
                                    </div>
                                </div>
                            </td>

                            {/* Language */}
                            <td>
                                <span className={`badge text-xs ${LANG_CLS[repo.language] ?? 'badge-neutral'}`}>
                                    {repo.language ?? '—'}
                                </span>
                            </td>

                            {/* Health */}
                            <td><HealthBar rate={repo.successRate ?? repo.healthScore ?? 0} /></td>

                            {/* Runs */}
                            <td>
                                <span className="font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">
                                    {(repo.totalRuns ?? 0).toLocaleString()}
                                </span>
                            </td>

                            {/* Last run */}
                            <td className="text-xs text-gray-400 whitespace-nowrap">
                                {repo.lastRunAt
                                    ? formatDistanceToNow(new Date(repo.lastRunAt), { addSuffix: true })
                                    : '—'}
                            </td>

                            {/* Status */}
                            <td><Badge status={(repo.lastRunStatus ?? 'pending').toLowerCase()} /></td>

                            {/* Actions */}
                            <td>
                                <div className="flex items-center justify-end gap-1 pr-1">
                                    <Link to={`/runs?repositoryId=${repo.id}`} className="btn-ghost p-1.5 rounded-md" title="View runs">
                                        <Activity size={14} />
                                    </Link>
                                    <button className="btn-ghost p-1.5 rounded-md" title="Sync now"
                                        onClick={() => handleSync(repo.id)} disabled={syncing === repo.id}>
                                        <RefreshCw size={14} className={syncing === repo.id ? 'animate-spin text-brand-500' : ''} />
                                    </button>
                                    {confirm === repo.id ? (
                                        <div className="flex items-center gap-1.5 animate-fade-in">
                                            <button className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                                                onClick={() => handleDelete(repo.id)}>
                                                {deleting === repo.id ? 'Removing…' : 'Confirm'}
                                            </button>
                                            <span className="text-gray-300 dark:text-gray-700 select-none">|</span>
                                            <button className="text-xs text-gray-400 hover:underline" onClick={() => setConfirm(null)}>
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button className="btn-ghost p-1.5 rounded-md hover:text-red-500 dark:hover:text-red-400"
                                            title="Remove" onClick={() => setConfirm(repo.id)}>
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}