import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { RefreshCw, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { runApi } from '@/api/client'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorBanner } from '@/components/ui'
import { RunDetailDrawer } from './RunDetailDrawer'
import { Play } from 'lucide-react'

// ── Duration formatter ────────────────────────────────────────────────────────
function fmtDur(ms) {
    if (!ms && ms !== 0) return '—'
    const s = Math.floor(ms / 1000)
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60), sec = s % 60
    return sec > 0 ? `${m}m ${sec}s` : `${m}m`
}

// ── Stage mini-bars ───────────────────────────────────────────────────────────
function StageBars({ stages = [], status }) {
    const bars = stages.length ? stages : inferBars(status)
    return (
        <div className="flex gap-0.5 items-end" title={stages.map(s => `${s.name}: ${s.status}`).join(' · ')}>
            {bars.map((s, i) => {
                const st = (s.status ?? '').toUpperCase()
                return (
                    <div key={i} className={`w-2 h-4 rounded-sm flex-shrink-0 ${st === 'SUCCESS' ? 'bg-emerald-500' :
                        st === 'FAILED' ? 'bg-red-500' :
                            st === 'RUNNING' ? 'bg-blue-500 animate-pulse' :
                                st === 'CANCELLED' ? 'bg-gray-400' : 'bg-gray-200 dark:bg-gray-700'
                        }`} />
                )
            })}
        </div>
    )
}

function inferBars(status) {
    const s = (status ?? '').toUpperCase()
    return [
        { status: 'SUCCESS' },
        { status: s === 'FAILED' ? 'FAILED' : 'SUCCESS' },
        { status: s === 'RUNNING' ? 'RUNNING' : s === 'FAILED' ? 'SKIPPED' : 'SUCCESS' },
        { status: s === 'SUCCESS' ? 'SUCCESS' : 'SKIPPED' },
    ]
}

// ── Row skeleton ──────────────────────────────────────────────────────────────
function RowSkeleton({ rows = 8 }) {
    return Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
            {[12, 28, 18, 14, 16, 18, 16, 10].map((w, j) => (
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
    return (
        <div className="flex items-center justify-center gap-1.5 pt-2">
            <button
                className="btn-secondary btn-sm p-1.5"
                onClick={() => onChange(page - 1)}
                disabled={page === 0}
            >
                <ChevronLeft size={15} />
            </button>

            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
                <button
                    key={i}
                    onClick={() => onChange(i)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors
            ${page === i
                            ? 'bg-brand-600 text-white shadow-sm'
                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                    {i + 1}
                </button>
            ))}

            {totalPages > 7 && (
                <span className="text-xs text-gray-400 px-1">…{totalPages}</span>
            )}

            <button
                className="btn-secondary btn-sm p-1.5"
                onClick={() => onChange(page + 1)}
                disabled={page >= totalPages - 1}
            >
                <ChevronRight size={15} />
            </button>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main component
// Props:
//   repositoryId     — filter to a single repo (optional, null = all)
//   statusFilter — 'all' | 'SUCCESS' | 'FAILED' | 'RUNNING' | 'PENDING'
//   compact    — reduced padding for embedding in Dashboard
// ═══════════════════════════════════════════════════════════════════════════════
export function RunsTable({ repositoryId, statusFilter = 'all', compact = false }) {
    const [runs, setRuns] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedRun, setSelected] = useState(null)

    const PAGE_SIZE = compact ? 8 : 15

    const fetch = useCallback(async () => {
        if (!repositoryId) return
        setLoading(true); setError(null)
        try {
            const params = {
                page,
                size: PAGE_SIZE,
                ...(statusFilter !== 'all' && { status: statusFilter }),
            }
            const res = await runApi.repoRuns(repositoryId, params)

            const payload = res.data?.data ?? res.data

            // Handles both PagedResponse and plain array
            if (Array.isArray(payload)) {
                setRuns(payload)
                setTotal(payload.length)
            } else {
                setRuns(payload?.content ?? [])
                setTotal(payload?.totalElements ?? 0)
            }
        } catch (e) {
            setError(e.response?.data?.message ?? 'Failed to load pipeline runs.')
        } finally {
            setLoading(false)
        }
    }, [repositoryId, page, statusFilter, PAGE_SIZE])

    useEffect(() => { fetch() }, [fetch])
    useEffect(() => { setPage(0) }, [repositoryId, statusFilter])

    const totalPages = Math.ceil(total / PAGE_SIZE)

    return (
        <div className="space-y-3">

            {/* Refresh + count */}
            <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{total} run{total !== 1 ? 's' : ''}</span>
                <button
                    className="btn-ghost p-1.5 rounded-lg"
                    onClick={fetch}
                    disabled={loading}
                    title="Refresh"
                >
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {error && <ErrorBanner message={error} onRetry={fetch} />}

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
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <RowSkeleton rows={compact ? 5 : 8} />}

                        {!loading && runs.length === 0 && (
                            <tr><td colSpan={8}>
                                <EmptyState
                                    icon={Play}
                                    title="No pipeline runs yet"
                                    description="Runs will appear here once your GitHub Actions workflows execute."
                                />
                            </td></tr>
                        )}

                        {!loading && runs.map(run => (
                            <tr
                                key={run.id}
                                className="cursor-pointer"
                                onClick={() => setSelected(run)}
                            >
                                {/* Build number */}
                                <td className="font-mono text-xs text-gray-400 whitespace-nowrap">
                                    #{run.buildNumber ?? run.runNumber ?? run.id}
                                </td>

                                {/* Workflow name */}
                                <td className="max-w-[160px]">
                                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                        {run.workflowName ?? run.name ?? 'Pipeline'}
                                    </p>
                                    {run.triggeredBy && (
                                        <p className="text-xs text-gray-400 capitalize">{run.triggeredBy}</p>
                                    )}
                                </td>

                                {/* Branch */}
                                <td>
                                    <span className="font-mono badge-neutral text-xs max-w-[100px] truncate block">
                                        {run.branch ?? run.ref ?? 'main'}
                                    </span>
                                </td>

                                {/* Commit */}
                                <td>
                                    <div className="flex items-center gap-1">
                                        <span className="font-mono text-xs text-gray-500">
                                            {(run.headSha ?? run.commitSha ?? '').slice(0, 7) || '—'}
                                        </span>
                                        {run.htmlUrl && (
                                            <a
                                                href={run.htmlUrl}
                                                target="_blank" rel="noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                className="text-gray-400 hover:text-brand-500"
                                            >
                                                <ExternalLink size={11} />
                                            </a>
                                        )}
                                    </div>
                                    {run.commitMessage && (
                                        <p className="text-xs text-gray-400 truncate max-w-[120px]">
                                            {run.commitMessage}
                                        </p>
                                    )}
                                </td>

                                {/* Status */}
                                <td>
                                    <Badge status={(run.status ?? '').toLowerCase()} />
                                </td>

                                {/* Stage bars */}
                                <td>
                                    <StageBars
                                        stages={run.stages ?? run.pipelineStages ?? []}
                                        status={run.status}
                                    />
                                </td>

                                {/* Duration — durationMs from backend */}
                                <td className="font-mono text-sm whitespace-nowrap">
                                    {fmtDur(run.durationMs ?? run.duration)}
                                </td>

                                {/* Started */}
                                <td className="text-xs text-gray-400 whitespace-nowrap">
                                    {run.startedAt
                                        ? formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })
                                        : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Pagination page={page} totalPages={totalPages} onChange={setPage} />

            {/* Run detail drawer */}
            <RunDetailDrawer
                run={selectedRun}
                repositoryId={repositoryId}
                open={selectedRun !== null}
                onClose={() => setSelected(null)}
            />
        </div>
    )
}