import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Play, RefreshCw, Filter, X } from 'lucide-react'
import { useRuns } from '@/hooks/useRuns'
import { useRepositories } from '@/hooks/useRepositories'
import { usePolling } from '@/hooks/usePolling'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorBanner } from '@/components/ui'
import { StageBars } from '@/components/runs/StageBars'
import { RunDetailDrawer } from '@/components/runs/RunDetailDrawer'
import { formatDistanceToNow } from 'date-fns'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDur(ms, s) {
    const val = ms ?? (s ? s * 1000 : null)
    if (!val && val !== 0) return '—'
    const sec = Math.floor(val / 1000)
    return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`
}

const STATUS_OPTS = ['all', 'SUCCESS', 'FAILED', 'RUNNING', 'PENDING', 'CANCELLED']

// ── Table skeleton ────────────────────────────────────────────────────────────
function RowSkeleton() {
    return Array.from({ length: 10 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
            {[12, 30, 22, 16, 18, 20, 18, 10, 6].map((w, j) => (
                <td key={j}>
                    <div className="skeleton h-3.5 rounded" style={{ width: `${w + (i + j * 2) % 14}%` }} />
                </td>
            ))}
        </tr>
    ))
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onChange }) {
    if (totalPages <= 1) return null
    const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i)
    return (
        <div className="flex items-center justify-center gap-1.5">
            <button className="btn-secondary btn-sm" onClick={() => onChange(page - 1)} disabled={page === 0}>
                ← Prev
            </button>
            {pages.map(p => (
                <button key={p} onClick={() => onChange(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors
            ${page === p ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                    {p + 1}
                </button>
            ))}
            {totalPages > 7 && <span className="text-xs text-gray-400 px-1">…{totalPages}</span>}
            <button className="btn-secondary btn-sm" onClick={() => onChange(page + 1)} disabled={page >= totalPages - 1}>
                Next →
            </button>
        </div>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Runs() {
    const [searchParams] = useSearchParams()
    const { repos } = useRepositories()
    const [selRepo, setSelRepo] = useState(searchParams.get('repositoryId') ?? '')
    const [status, setStatus] = useState('all')
    const [page, setPage] = useState(0)
    const [selected, setSelected] = useState(null)

    useEffect(() => { setPage(0) }, [selRepo, status])

    const params = useMemo(() => ({
        repositoryId: selRepo || undefined,
        status, page, size: 15,
    }), [selRepo, status, page])

    const { runs, total, loading, error, refetch } = useRuns(params)

    const hasLive = runs.some(r => ['running', 'RUNNING'].includes(r.status ?? ''))
    const totalPages = Math.ceil((total || runs.length) / 15)

    usePolling(refetch, hasLive ? 15_000 : 60_000)

    return (
        <div className="space-y-5">

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <Filter size={14} className="text-gray-400 flex-shrink-0" />

                    {repos.length > 0 && (
                        <select
                            className="input h-8 text-xs w-auto pr-8 min-w-[140px]"
                            value={selRepo}
                            onChange={e => { setSelRepo(e.target.value); setPage(0) }}
                        >
                            <option value="">All repositories</option>
                            {repos.map(r => (
                                <option key={r.id} value={r.id}>{r.owner}/{r.repoName}</option>
                            ))}
                        </select>
                    )}

                    <div className="flex gap-1 flex-wrap">
                        {STATUS_OPTS.map(s => (
                            <button key={s} onClick={() => { setStatus(s); setPage(0) }}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize
                  ${status === s
                                        ? 'bg-brand-600 text-white shadow-sm'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}>
                                {s.toLowerCase()}
                            </button>
                        ))}
                    </div>

                    {(selRepo || status !== 'all') && (
                        <button onClick={() => { setSelRepo(''); setStatus('all') }}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <X size={12} /> Clear
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {hasLive && (
                        <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            Live
                        </span>
                    )}
                    <span className="text-xs text-gray-400">{total} run{total !== 1 ? 's' : ''}</span>
                    <button className="btn-secondary btn-sm" onClick={refetch} disabled={loading}>
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {error && <ErrorBanner message={error} onRetry={refetch} />}

            {/* Table */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Workflow</th>
                            <th>Branch</th>
                            <th>Commit</th>
                            <th>Status</th>
                            <th>Stages</th>
                            <th>Duration</th>
                            <th>Started</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <RowSkeleton />}

                        {!loading && runs.length === 0 && (
                            <tr><td colSpan={9}>
                                <EmptyState
                                    icon={Play}
                                    title="No pipeline runs found"
                                    description="Runs appear here once your connected repositories execute their workflows."
                                />
                            </td></tr>
                        )}

                        {!loading && runs.map(run => (
                            <tr key={run.id} className="cursor-pointer" onClick={() => setSelected(run)}>
                                <td className="font-mono text-xs text-gray-400 whitespace-nowrap">
                                    #{run.buildNumber ?? run.runNumber ?? run.id}
                                </td>
                                <td className="max-w-[160px]">
                                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                        {run.workflowName ?? run.name ?? 'Pipeline'}
                                    </p>
                                    <p className="text-xs text-gray-400 capitalize">{run.triggeredBy ?? run.trigger ?? 'push'}</p>
                                </td>
                                <td>
                                    <span className="font-mono badge-neutral text-xs max-w-[100px] truncate block">
                                        {run.branch ?? run.ref ?? 'main'}
                                    </span>
                                </td>
                                <td>
                                    <span className="font-mono text-xs text-gray-500">
                                        {(run.headSha ?? run.commitSha ?? '').slice(0, 7) || '—'}
                                    </span>
                                </td>
                                <td><Badge status={(run.status ?? '').toLowerCase()} /></td>
                                <td>
                                    <StageBars
                                        stages={run.stages ?? run.pipelineStages ?? []}
                                        runStatus={run.status}
                                    />
                                </td>
                                <td className="font-mono text-sm">
                                    {fmtDur(run.durationMs, run.durationSeconds)}
                                </td>
                                <td className="text-xs text-gray-400 whitespace-nowrap">
                                    {run.startedAt
                                        ? formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })
                                        : '—'}
                                </td>
                                <td>
                                    <span className="text-gray-300 dark:text-gray-600 text-base">›</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Pagination page={page} totalPages={totalPages} onChange={setPage} />

            {/* Slide-in drawer — replaces modal */}
            <RunDetailDrawer
                run={selected}
                repositoryId={selRepo || selected?.repositoryId}
                open={selected !== null}
                onClose={() => setSelected(null)}
            />
        </div>
    )
}