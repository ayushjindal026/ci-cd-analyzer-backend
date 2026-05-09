import { useState, useMemo } from 'react'
import { Play, RefreshCw, Filter, ChevronRight } from 'lucide-react'
import { useRuns, useRunDetail } from '@/hooks/useTestRuns'
import { useRepositories } from '@/hooks/useRepositories'
import { runApi } from '@/api/client'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorBanner } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { formatDistanceToNow, format } from 'date-fns'

const STATUS_OPTS = ['all', 'SUCCESS', 'FAILED', 'RUNNING', 'PENDING', 'CANCELLED']

function fmtDur(s) {
    if (!s) return '—'
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

// ── Stage mini-bars ───────────────────────────────────────────────────────────
function StageBars({ stages = [], status }) {
    if (!stages.length) {
        // Infer from run status if stages not returned
        const fallback = [
            { status: 'SUCCESS' },
            { status: status === 'FAILED' ? 'FAILED' : 'SUCCESS' },
            { status: status === 'FAILED' ? 'SKIPPED' : status === 'RUNNING' ? 'RUNNING' : 'SUCCESS' },
            { status: status === 'SUCCESS' ? 'SUCCESS' : 'SKIPPED' },
        ]
        stages = fallback
    }
    return (
        <div className="flex gap-0.5">
            {stages.map((s, i) => (
                <div
                    key={i}
                    title={s.name ?? `Stage ${i + 1}`}
                    className={`w-2 h-4 rounded-sm transition-all ${(s.status ?? '').toUpperCase() === 'SUCCESS' ? 'bg-emerald-500' :
                            (s.status ?? '').toUpperCase() === 'FAILED' ? 'bg-red-500' :
                                (s.status ?? '').toUpperCase() === 'RUNNING' ? 'bg-blue-500 animate-pulse' :
                                    (s.status ?? '').toUpperCase() === 'CANCELLED' ? 'bg-gray-400' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                />
            ))}
        </div>
    )
}

// ── Run detail modal ──────────────────────────────────────────────────────────
function RunDetailModal({ run: baseRun, open, onClose }) {
    const { run, analysis, loading } = useRunDetail(
        baseRun?.repositoryId ?? baseRun?.repoId,
        baseRun?.id
    )
    const display = run ?? baseRun
    const [triggering, setTriggering] = useState(false)
    const [triggered, setTriggered] = useState(false)

    const handleAnalyse = async () => {
        if (!display) return
        setTriggering(true)
        try {
            await runApi.analyse(display.repositoryId ?? display.repoId, display.id)
            setTriggered(true)
        } catch { /* swallow */ }
        finally { setTriggering(false) }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Run #${display?.buildNumber ?? display?.runNumber ?? display?.id}`}
            footer={
                <div className="flex items-center justify-between w-full">
                    <button
                        className="btn-primary btn-sm"
                        onClick={handleAnalyse}
                        disabled={triggering || triggered}
                    >
                        {triggering ? <><Spinner size="sm" /> Analysing…</> :
                            triggered ? '✓ Analysis queued' : '⚡ Trigger AI Analysis'}
                    </button>
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                </div>
            }
        >
            {loading
                ? <div className="flex justify-center py-8"><Spinner /></div>
                : (
                    <div className="space-y-5">
                        {/* Meta grid */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {[
                                ['Status', <Badge status={display?.status} />],
                                ['Branch', <span className="font-mono text-xs">{display?.branch ?? 'main'}</span>],
                                ['Commit', <span className="font-mono text-xs">{(display?.commitSha ?? display?.commit ?? '').slice(0, 7) || '—'}</span>],
                                ['Duration', fmtDur(display?.duration ?? display?.durationSeconds)],
                                ['Trigger', display?.trigger ?? display?.triggeredBy ?? 'push'],
                                ['Started', display?.startedAt ? format(new Date(display.startedAt), 'PPpp') : '—'],
                            ].map(([k, v]) => (
                                <div key={k} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                    <p className="text-xs text-gray-400 mb-1">{k}</p>
                                    <div className="font-medium text-gray-900 dark:text-gray-100">{v}</div>
                                </div>
                            ))}
                        </div>

                        {/* Stage breakdown if available */}
                        {(display?.stages ?? display?.pipelineStages ?? []).length > 0 && (
                            <div>
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Stages</p>
                                <div className="space-y-2">
                                    {(display.stages ?? display.pipelineStages).map((s, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <Badge status={(s.status ?? '').toLowerCase()} />
                                            <span className="text-sm flex-1 text-gray-800 dark:text-gray-100">{s.name}</span>
                                            <span className="font-mono text-xs text-gray-400">{fmtDur(s.duration ?? s.durationSeconds)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* AI Analysis result */}
                        {analysis && (
                            <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl p-4">
                                <p className="text-xs font-semibold text-brand-700 dark:text-brand-300 mb-2">⚡ AI Analysis</p>
                                <p className="text-sm text-brand-800 dark:text-brand-200">
                                    {analysis.summary ?? analysis.diagnosis ?? analysis.result ?? JSON.stringify(analysis)}
                                </p>
                                {analysis.recommendation && (
                                    <p className="text-xs text-brand-600 dark:text-brand-400 mt-2">
                                        💡 {analysis.recommendation}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Failure reason */}
                        {(display?.status ?? '').toUpperCase() === 'FAILED' && !analysis && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Failure Info</p>
                                <p className="font-mono text-xs text-red-600 dark:text-red-300">
                                    {display.failureReason ?? display.errorMessage ?? 'Trigger AI Analysis for root cause diagnosis.'}
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
    const { repos } = useRepositories()
    const [selRepo, setSelRepo] = useState('')
    const [status, setStatus] = useState('all')
    const [page, setPage] = useState(0)
    const [selectedRun, setSelected] = useState(null)

    const params = useMemo(() => ({
        repoId: selRepo || undefined,
        ...(status !== 'all' && { status }),
        page, size: 15,
    }), [selRepo, status, page])

    const { runs, total, loading, error, refetch } = useRuns(params)

    return (
        <div className="space-y-5 animate-fade-in">

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <Filter size={15} className="text-gray-400 flex-shrink-0" />

                    {/* Repo filter */}
                    {repos.length > 0 && (
                        <select
                            className="input h-8 text-xs w-auto pr-7"
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
                    {STATUS_OPTS.map(s => (
                        <button
                            key={s}
                            onClick={() => { setStatus(s); setPage(0) }}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize
                ${status === s
                                    ? 'bg-brand-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            {s.toLowerCase()}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{total || runs.length} runs</span>
                    <button className="btn-secondary btn-sm" onClick={refetch} disabled={loading}>
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {error && <ErrorBanner message={error} onRetry={refetch} />}

            {loading
                ? <div className="flex justify-center py-20"><Spinner size="lg" /></div>
                : (
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
                                {runs.length === 0 && (
                                    <tr>
                                        <td colSpan={9}>
                                            <EmptyState
                                                icon={Play}
                                                title="No runs found"
                                                description="Pipeline runs will appear here once your repositories execute their CI/CD workflows."
                                            />
                                        </td>
                                    </tr>
                                )}
                                {runs.map(run => (
                                    <tr
                                        key={run.id}
                                        className="cursor-pointer"
                                        onClick={() => setSelected(run)}
                                    >
                                        <td className="font-mono text-gray-400 text-xs">
                                            #{run.buildNumber ?? run.runNumber ?? run.id}
                                        </td>
                                        <td className="font-medium max-w-[160px] truncate">
                                            {run.repoName ?? run.repositoryName ?? run.repositoryFullName ?? '—'}
                                        </td>
                                        <td>
                                            <span className="font-mono badge-neutral text-xs">
                                                {run.branch ?? run.ref ?? 'main'}
                                            </span>
                                        </td>
                                        <td><Badge status={(run.status ?? '').toLowerCase()} /></td>
                                        <td>
                                            <StageBars
                                                stages={run.stages ?? run.pipelineStages ?? []}
                                                status={run.status}
                                            />
                                        </td>
                                        <td className="font-mono text-sm">{fmtDur(run.duration ?? run.durationSeconds)}</td>
                                        <td className="text-xs text-gray-400 whitespace-nowrap">
                                            {run.startedAt
                                                ? formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })
                                                : '—'}
                                        </td>
                                        <td className="text-xs text-gray-400">{run.trigger ?? run.triggeredBy ?? 'push'}</td>
                                        <td>
                                            <ChevronRight size={14} className="text-gray-300" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

            {/* Pagination */}
            {total > 15 && (
                <div className="flex items-center justify-center gap-3">
                    <button
                        className="btn-secondary btn-sm"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                    >← Prev</button>
                    <span className="text-sm text-gray-500">Page {page + 1} of {Math.ceil(total / 15)}</span>
                    <button
                        className="btn-secondary btn-sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={(page + 1) * 15 >= total}
                    >Next →</button>
                </div>
            )}

            {/* Run detail */}
            <RunDetailModal
                run={selectedRun}
                open={selectedRun !== null}
                onClose={() => setSelected(null)}
            />
        </div>
    )
}