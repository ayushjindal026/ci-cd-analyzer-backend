import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Play } from 'lucide-react'
import { useRuns } from '@/hooks/useRuns'
import { useRepositories } from '@/hooks/useRepositories'
import { usePolling } from '@/hooks/usePolling'
import { useToast } from '@/components/ui/Toast'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorBanner } from '@/components/ui'
import { RunFilters } from '@/components/runs/RunFilters'
import { RunDetailModal } from '@/components/runs/RunDetailModal'
import { StageBars } from '@/components/runs/StageBars'
import { formatDistanceToNow } from 'date-fns'

function fmtDur(s) {
    if (!s && s !== 0) return '—'
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

// ── Table skeleton ────────────────────────────────────────────────────────────
function RowSkeleton() {
    return Array.from({ length: 10 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
            {[12, 32, 22, 16, 18, 20, 16, 10, 6].map((w, j) => (
                <td key={j}>
                    <div className="skeleton h-3.5 rounded" style={{ width: `${w + (i + j * 2) % 14}%` }} />
                </td>
            ))}
        </tr>
    ))
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onPage }) {
    if (totalPages <= 1) return null
    const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i)
    return (
        <div className="flex items-center justify-center gap-1.5">
            <button
                className="btn-secondary btn-sm"
                onClick={() => onPage(Math.max(0, page - 1))}
                disabled={page === 0}
            >← Prev</button>

            {pages.map(p => (
                <button
                    key={p}
                    onClick={() => onPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors
            ${page === p
                            ? 'bg-brand-600 text-white shadow-sm'
                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >{p + 1}</button>
            ))}
            {totalPages > 7 && <span className="text-xs text-gray-400 px-1">…{totalPages}</span>}

            <button
                className="btn-secondary btn-sm"
                onClick={() => onPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
            >Next →</button>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Runs() {
    const { toast } = useToast()
    const [searchParams] = useSearchParams()
    const { repos } = useRepositories()

    const [selRepo, setSelRepo] = useState(searchParams.get('repoId') ?? '')
    const [status, setStatus] = useState('all')
    const [page, setPage] = useState(0)
    const [selected, setSelected] = useState(null)

    // Reset page on filter change
    useEffect(() => { setPage(0) }, [selRepo, status])

    const params = useMemo(() => ({
        repoId: selRepo || undefined,
        status, page, size: 15,
    }), [selRepo, status, page])

    const { runs, total, loading, error, refetch } = useRuns(params)

    // Poll every 15s when any run is currently running
    const hasLive = runs.some(r => ['running', 'RUNNING'].includes(r.status ?? ''))
    usePolling(refetch, hasLive ? 15_000 : 45_000)

    const totalPages = Math.ceil((total || runs.length) / 15)

    return (
        <div className="space-y-5">

            <RunFilters
                repos={repos}
                selRepo={selRepo} setSelRepo={setSelRepo}
                status={status} setStatus={setStatus}
                onClear={() => { setSelRepo(''); setStatus('all') }}
                total={total || runs.length}
                onRefresh={refetch}
                loading={loading}
            />

            {error && <ErrorBanner message={error} onRetry={refetch} />}

            {/* Live indicator */}
            {hasLive && (
                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Live runs detected — auto-refreshing every 15s
                </div>
            )}

            {/* Table */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Repository</th>
                            <th>Branch</th>
                            <th>Status</th>
                            <th>Stages</th>
                            <th>Duration</th>
                            <th>Started</th>
                            <th>Trigger</th>
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
                                    description="Runs appear here once your connected repos execute their CI/CD workflows."
                                />
                            </td></tr>
                        )}

                        {!loading && runs.map(run => (
                            <tr
                                key={run.id}
                                className="cursor-pointer"
                                onClick={() => setSelected(run)}
                            >
                                <td className="font-mono text-xs text-gray-400">
                                    #{run.buildNumber ?? run.runNumber ?? run.id}
                                </td>
                                <td className="font-medium max-w-[160px] truncate text-gray-900 dark:text-gray-100">
                                    {run.repoName ?? run.repositoryName ?? run.repositoryFullName ?? '—'}
                                </td>
                                <td>
                                    <span className="font-mono badge-neutral text-xs max-w-[100px] truncate block">
                                        {run.branch ?? run.ref ?? 'main'}
                                    </span>
                                </td>
                                <td>
                                    <Badge status={(run.status ?? '').toLowerCase()} />
                                </td>
                                <td>
                                    <StageBars
                                        stages={run.stages ?? run.pipelineStages ?? []}
                                        runStatus={run.status}
                                    />
                                </td>
                                <td className="font-mono text-sm">
                                    {fmtDur(run.duration ?? run.durationSeconds)}
                                </td>
                                <td className="text-xs text-gray-400 whitespace-nowrap">
                                    {run.startedAt
                                        ? formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })
                                        : '—'}
                                </td>
                                <td className="text-xs text-gray-400 capitalize">
                                    {run.trigger ?? run.triggeredBy ?? 'push'}
                                </td>
                                <td>
                                    <span className="text-gray-300 dark:text-gray-600 text-base">›</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Pagination page={page} totalPages={totalPages} onPage={setPage} />

            <RunDetailModal
                run={selected}
                open={selected !== null}
                onClose={() => setSelected(null)}
            />
        </div>
    )
}