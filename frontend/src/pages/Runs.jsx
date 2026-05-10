import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Play, RefreshCw, Filter, ChevronRight, Zap, X } from 'lucide-react'
import { useRuns, useRunDetail } from '@/hooks/useRuns'
import { useRepositories } from '@/hooks/useRepositories'
import { runApi } from '@/api/client'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorBanner } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { formatDistanceToNow, format } from 'date-fns'

const STATUS_OPTS = ['all', 'SUCCESS', 'FAILED', 'RUNNING', 'PENDING', 'CANCELLED']

function fmtDur(s) {
    if (!s && s !== 0) return '—'
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60), sec = s % 60
    return sec ? `${m}m ${sec}s` : `${m}m`
}

// ── Stage mini bars ───────────────────────────────────────────────────────────
function StageBars({ stages = [], runStatus }) {
    const bars = stages.length ? stages : inferBars(runStatus)
    return (
        <div className="flex gap-0.5 items-end">
            {bars.map((s, i) => {
                const st = (s.status ?? '').toUpperCase()
                const cls =
                    st === 'SUCCESS' ? 'bg-emerald-500' :
                        st === 'FAILED' ? 'bg-red-500' :
                            st === 'RUNNING' ? 'bg-blue-500 animate-pulse' :
                                st === 'CANCELLED' ? 'bg-gray-400' : 'bg-gray-200 dark:bg-gray-700'
                return (
                    <div
                        key={i}
                        title={s.name ?? `Stage ${i + 1}`}
                        className={`w-2 h-4 rounded-sm ${cls}`}
                    />
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
        { status: s === 'FAILED' ? 'SKIPPED' : s === 'RUNNING' ? 'RUNNING' : 'SUCCESS' },
        { status: s === 'SUCCESS' ? 'SUCCESS' : 'SKIPPED' },
    ]
}

// ── Table skeleton ────────────────────────────────────────────────────────────
function RowSkeleton() {
    return Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
            {[15, 35, 25, 18, 20, 22, 18, 10].map((w, j) => (
                <td key={j}>
                    <div className="skeleton h-3.5 rounded" style={{ width: `${w + (i + j) % 15}%` }} />
                </td>
            ))}
        </tr>
    ))
}

// ── Run detail modal ──────────────────────────────────────────────────────────
function RunDetailModal({ run: baseRun, open, onClose }) {
    const repoId = baseRun?.repositoryId ?? baseRun?.repoId
    const runId = baseRun?.id
    const { run, analysis, loading } = useRunDetail(repoId, runId)
    const display = run ?? baseRun

    const [triggering, setTriggering] = useState(false)
    const [triggered, setTriggered] = useState(false)
    const [trigErr, setTrigErr] = useState(null)

    // reset on new run
    useEffect(() => { setTriggered(false); setTrigErr(null) }, [runId])

    const handleAnalyse = async () => {
        if (!repoId || !runId) return
        setTriggering(true); setTrigErr(null)
        try { await runApi.analyse(repoId, runId); setTriggered(true) }
        catch (e) { setTrigErr(e.response?.data?.message ?? 'Failed to trigger analysis') }
        finally { setTriggering(false) }
    }

    const isFailed = ['failed', 'failure', 'FAILED', 'FAILURE'].includes(display?.status ?? '')

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="lg"
            title={`Run #${display?.buildNumber ?? display?.runNumber ?? display?.id ?? '…'}`}
            footer={
                <div className="flex items-center justify-between w-full">
                    {isFailed && (
                        <button
                            className="btn-primary btn-sm"
                            onClick={handleAnalyse}
                            disabled={triggering || triggered}
                        >
                            {triggering ? <><Spinner size="sm" /> Analysing…</> :
                                triggered ? <><Zap size={13} /> Queued!</> :
                                    <><Zap size={13} /> AI Diagnosis</>}
                        </button>
                    )}
                    {trigErr && <p className="text-xs text-red-500 ml-2">{trigErr}</p>}
                    <button className="btn-secondary ml-auto" onClick={onClose}>Close</button>
                </div>
            }
        >
            {loading
                ? <div className="flex justify-center py-10"><Spinner size="lg" /></div>
                : display && (
                    <div className="space-y-5">

                        {/* Meta grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {[
                                ['Status', <Badge status={(display.status ?? '').toLowerCase()} />],
                                ['Branch', <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{display.branch ?? 'main'}</span>],
                                ['Commit', <span className="font-mono text-xs">{(display.commitSha ?? display.commit ?? '').slice(0, 7) || '—'}</span>],
                                ['Duration', fmtDur(display.duration ?? display.durationSeconds)],
                                ['Trigger', display.trigger ?? display.triggeredBy ?? 'push'],
                                ['Started', display.startedAt ? format(new Date(display.startedAt), 'MMM d, HH:mm') : '—'],
                            ].map(([k, v]) => (
                                <div key={k} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{k}</p>
                                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{v}</div>
                                </div>
                            ))}
                        </div>

                        {/* Stage timeline */}
                        {(display.stages ?? display.pipelineStages ?? []).length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
                                    Stage Timeline
                                </p>
                                <div className="space-y-2">
                                    {(display.stages ?? display.pipelineStages).map((s, i) => {
                                        const st = (s.status ?? '').toUpperCase()
                                        const barCls =
                                            st === 'SUCCESS' ? 'bg-emerald-500' :
                                                st === 'FAILED' ? 'bg-red-500' :
                                                    st === 'RUNNING' ? 'bg-blue-500 animate-pulse' : 'bg-gray-200 dark:bg-gray-700'
                                        const dur = s.duration ?? s.durationSeconds ?? 0
                                        const maxDur = Math.max(...(display.stages ?? display.pipelineStages).map(x => x.duration ?? x.durationSeconds ?? 0), 1)
                                        return (
                                            <div key={i} className="flex items-center gap-3">
                                                <Badge status={(s.status ?? '').toLowerCase()} />
                                                <span className="text-sm text-gray-800 dark:text-gray-100 w-24 flex-shrink-0">{s.name}</span>
                                                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                                                    <div
                                                        className={`${barCls} h-2 rounded-full`}
                                                        style={{ width: `${Math.max(2, (dur / maxDur) * 100)}%` }}
                                                    />
                                                </div>
                                                <span className="font-mono text-xs text-gray-400 w-14 text-right flex-shrink-0">{fmtDur(dur)}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* AI Analysis */}
                        {analysis && (
                            <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl p-4 space-y-2">
                                <p className="text-xs font-semibold text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
                                    <Zap size={13} /> AI Analysis
                                </p>
                                <p className="text-sm text-brand-800 dark:text-brand-200">
                                    {analysis.summary ?? analysis.diagnosis ?? analysis.result ?? JSON.stringify(analysis)}
                                </p>
                                {analysis.recommendation && (
                                    <div className="mt-2 pt-2 border-t border-brand-200 dark:border-brand-800">
                                        <p className="text-xs font-medium text-brand-700 dark:text-brand-300 mb-0.5">💡 Recommendation</p>
                                        <p className="text-xs text-brand-700 dark:text-brand-300">{analysis.recommendation}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Failure info (no analysis yet) */}
                        {isFailed && !analysis && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Failure Details</p>
                                <p className="font-mono text-xs text-red-600 dark:text-red-300">
                                    {display.failureReason ?? display.errorMessage ?? 'Click "AI Diagnosis" above to generate a root cause analysis.'}
                                </p>
                            </div>
                        )}
                    </div>
                )}
        </Modal>
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Runs() {
    const [searchParams] = useSearchParams()
    const { repos } = useRepositories()
    const [selRepo, setSelRepo] = useState(searchParams.get('repoId') ?? '')
    const [status, setStatus] = useState('all')
    const [page, setPage] = useState(0)
    const [selectedRun, setSelected] = useState(null)

    const params = useMemo(() => ({
        repoId: selRepo || undefined,
        status, page, size: 15,
    }), [selRepo, status, page])

    const { runs, total, loading, error, refetch } = useRuns(params)
    const totalPages = Math.ceil(total / 15)

    const clearFilters = () => { setSelRepo(''); setStatus('all'); setPage(0) }
    const hasFilters = selRepo || status !== 'all'

    return (
        <div className="space-y-5 animate-fade-in">

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <Filter size={14} className="text-gray-400 flex-shrink-0" />

                    {/* Repo selector */}
                    {repos.length > 0 && (
                        <select
                            className="input h-8 text-xs w-auto pr-8"
                            value={selRepo}
                            onChange={e => { setSelRepo(e.target.value); setPage(0) }}
                        >
                            <option value="">All repositories</option>
                            {repos.map(r => (
                                <option key={r.id} value={r.id}>{r.fullName ?? r.name}</option>
                            ))}
                        </select>
                    )}

                    {/* Status pills */}
                    <div className="flex gap-1 flex-wrap">
                        {STATUS_OPTS.map(s => (
                            <button
                                key={s}
                                onClick={() => { setStatus(s); setPage(0) }}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize
                  ${status === s
                                        ? 'bg-brand-600 text-white shadow-sm'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {s.toLowerCase()}
                            </button>
                        ))}
                    </div>

                    {hasFilters && (
                        <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <X size={12} /> Clear
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
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
                            <tr>
                                <td colSpan={9}>
                                    <EmptyState
                                        icon={Play}
                                        title="No pipeline runs found"
                                        description="Runs will appear here once your connected repositories execute their CI/CD workflows."
                                    />
                                </td>
                            </tr>
                        )}

                        {!loading && runs.map(run => (
                            <tr key={run.id} className="cursor-pointer" onClick={() => setSelected(run)}>
                                <td className="font-mono text-gray-400 text-xs">
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
                                <td className="font-mono text-sm text-gray-700 dark:text-gray-300">
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
                                    <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button
                        className="btn-secondary btn-sm"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                    >
                        ← Prev
                    </button>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
                            <button
                                key={i}
                                onClick={() => setPage(i)}
                                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors
                  ${page === i
                                        ? 'bg-brand-600 text-white'
                                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                        {totalPages > 7 && <span className="text-gray-400 text-xs px-1">…</span>}
                    </div>
                    <button
                        className="btn-secondary btn-sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= totalPages - 1}
                    >
                        Next →
                    </button>
                </div>
            )}

            {/* Detail modal */}
            <RunDetailModal
                run={selectedRun}
                open={selectedRun !== null}
                onClose={() => setSelected(null)}
            />
        </div>
    )
}