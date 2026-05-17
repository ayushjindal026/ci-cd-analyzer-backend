import { useState, useEffect, useRef } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
    X, Zap, ExternalLink, GitCommit, Clock,
    CheckCircle2, XCircle, Loader2, SkipForward,
    ChevronRight, Copy, Check,
} from 'lucide-react'
import { runApi } from '@/api/client'
import { useToast } from '@/components/ui/Toast'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { DEMO_RUNS, DEMO_INSIGHTS } from '@/demo/demoData'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMs(ms) {
    if (!ms && ms !== 0) return '—'
    const s = Math.floor(ms / 1000)
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

function fmtDur(durationMs, durationSeconds) {
    if (durationMs) return fmtMs(durationMs)
    if (durationSeconds) return fmtMs(durationSeconds * 1000)
    return '—'
}

// ── Stage status icon ─────────────────────────────────────────────────────────
function StageIcon({ status }) {
    const s = (status ?? '').toUpperCase()
    if (s === 'SUCCESS') return <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
    if (s === 'FAILED') return <XCircle size={15} className="text-red-500     flex-shrink-0" />
    if (s === 'RUNNING') return <Loader2 size={15} className="text-blue-500 animate-spin flex-shrink-0" />
    return <SkipForward size={15} className="text-gray-400 flex-shrink-0" />
}

// ── Stage timeline ────────────────────────────────────────────────────────────
function StageTimeline({ stages }) {
    if (!stages?.length) return null

    const maxMs = Math.max(...stages.map(s => s.durationMs ?? s.durationSeconds * 1000 ?? 0), 1)

    return (
        <div className="space-y-2.5">
            {stages.map((s, i) => {
                const ms = s.durationMs ?? (s.durationSeconds ? s.durationSeconds * 1000 : null)
                const pct = ms ? Math.max(2, (ms / maxMs) * 100) : 0
                const barCls =
                    (s.status ?? '').toUpperCase() === 'SUCCESS' ? 'bg-emerald-500' :
                        (s.status ?? '').toUpperCase() === 'FAILED' ? 'bg-red-500' :
                            (s.status ?? '').toUpperCase() === 'RUNNING' ? 'bg-blue-500 animate-pulse' :
                                'bg-gray-200 dark:bg-gray-700'

                return (
                    <div key={i} className="flex items-center gap-3">
                        <StageIcon status={s.status} />
                        <span className="text-sm text-gray-800 dark:text-gray-100 w-24 flex-shrink-0 truncate">
                            {s.name}
                        </span>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                            <div className={`${barCls} h-2 rounded-full transition-all duration-500`}
                                style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-mono text-xs text-gray-400 w-14 text-right flex-shrink-0">
                            {fmtMs(ms)}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text }) {
    const [copied, setCopied] = useState(false)
    const copy = () => {
        navigator.clipboard.writeText(text).catch(() => { })
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <button onClick={copy} className="text-gray-400 hover:text-gray-200 transition-colors" title="Copy">
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
        </button>
    )
}

// ── AI analysis panel ─────────────────────────────────────────────────────────
function AnalysisPanel({ analysis, onTrigger, triggering, triggered, demoMode }) {
    if (!analysis && !demoMode) {
        return (
            <div className="space-y-2">
                <p className="text-xs text-gray-400">No AI analysis yet for this run.</p>
                <button
                    className="btn-primary btn-sm"
                    onClick={onTrigger}
                    disabled={triggering || triggered}
                >
                    {triggering ? <><Spinner size="sm" /> Analysing…</> :
                        triggered ? '✓ Analysis queued' :
                            <><Zap size={13} /> Run AI Diagnosis</>}
                </button>
                {triggered && (
                    <p className="text-xs text-gray-400">
                        Results appear in the Insights page within ~30 seconds.
                    </p>
                )}
            </div>
        )
    }

    const a = analysis
    if (!a) return null

    return (
        <div className="space-y-3">
            {/* Summary */}
            {a.summary && (
                <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl p-3">
                    <p className="text-xs font-semibold text-brand-700 dark:text-brand-300 flex items-center gap-1.5 mb-1">
                        <Zap size={12} /> AI Summary
                    </p>
                    <p className="text-sm text-brand-800 dark:text-brand-200 leading-relaxed">{a.summary}</p>
                </div>
            )}

            {/* Root cause */}
            {a.rootCause && (
                <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                        Root Cause
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{a.rootCause}</p>
                </div>
            )}

            {/* Remediation steps */}
            {a.remediationSteps?.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                        Remediation Steps
                    </p>
                    <ol className="space-y-1.5">
                        {(typeof a.remediationSteps === 'string'
                            ? a.remediationSteps.split('\n').filter(Boolean)
                            : a.remediationSteps
                        ).map((step, i) => (
                            <li key={i} className="flex gap-2 text-xs text-gray-700 dark:text-gray-300">
                                <span className="text-brand-500 font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>
                                <span className="leading-relaxed">{step.replace(/^\d+\.\s*/, '')}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-400 pt-1">
                {a.priority && <span className="badge-neutral">{a.priority}</span>}
                {a.isFlaky && <span className="badge-warning">Flaky test detected</span>}
                {a.estimatedFixTime && <span>Est. fix: <strong className="text-gray-600 dark:text-gray-300">{a.estimatedFixTime}</strong></span>}
                {a.modelUsed && <span className="font-mono">{a.modelUsed}</span>}
            </div>
        </div>
    )
}

// ── Meta grid ─────────────────────────────────────────────────────────────────
function MetaGrid({ run }) {
    const items = [
        ['Status', <Badge status={(run.status ?? '').toLowerCase()} />],
        ['Branch', <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{run.branch ?? 'main'}</code>],
        ['Commit', <div className="flex items-center gap-1.5">
            <code className="font-mono text-xs">{(run.headSha ?? run.commitSha ?? '').slice(0, 7) || '—'}</code>
            {(run.headSha ?? run.commitSha) && <CopyButton text={run.headSha ?? run.commitSha} />}
        </div>],
        ['Duration', fmtDur(run.durationMs, run.durationSeconds)],
        ['Trigger', <span className="capitalize">{run.triggeredBy ?? run.trigger ?? 'push'}</span>],
        ['Started', run.startedAt ? format(new Date(run.startedAt), 'MMM d, HH:mm:ss') : '—'],
    ]
    return (
        <div className="grid grid-cols-2 gap-2">
            {items.map(([k, v]) => (
                <div key={k} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{k}</p>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{v}</div>
                </div>
            ))}
        </div>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main drawer component
//
// Props:
//   run        — the PipelineRun object (from table row)
//   repoId     — number (used for API calls)
//   open       — boolean
//   onClose    — () => void
//   demoMode   — boolean (skips API calls, uses demo data)
// ═════════════════════════════════════════════════════════════════════════════
export function RunDetailDrawer({ run: baseRun, repoId, open, onClose, demoMode = false }) {
    const { toast } = useToast() ?? {}
    const [analysis, setAnalysis] = useState(null)
    const [loadingA, setLoadingA] = useState(false)
    const [triggering, setTriggering] = useState(false)
    const [triggered, setTriggered] = useState(false)
    const drawerRef = useRef(null)

    // Reset on new run
    useEffect(() => {
        setAnalysis(null); setTriggered(false)
    }, [baseRun?.id])

    // Fetch analysis when drawer opens (real mode only)
    useEffect(() => {
        if (!open || !baseRun || demoMode) return
        const rid = repoId ?? baseRun.repositoryId ?? baseRun.repoId
        const runId = baseRun.id
        if (!rid || !runId) return

        setLoadingA(true)
        runApi.analysis(rid, runId)
            .then(res => setAnalysis(res.data))
            .catch(() => setAnalysis(null))
            .finally(() => setLoadingA(false))
    }, [open, baseRun?.id])  // eslint-disable-line

    // Demo mode: find pre-computed analysis from demo data
    useEffect(() => {
        if (!open || !demoMode || !baseRun) return
        const match = DEMO_INSIGHTS.find(i => i.runId === baseRun.id)
        setAnalysis(match ?? null)
    }, [open, baseRun?.id, demoMode])

    // Close on Escape
    useEffect(() => {
        if (!open) return
        const handler = e => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handler)
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', handler)
            document.body.style.overflow = ''
        }
    }, [open, onClose])

    const handleTrigger = async () => {
        if (!baseRun || demoMode) return
        const rid = repoId ?? baseRun.repositoryId ?? baseRun.repoId
        setTriggering(true)
        try {
            await runApi.analyse(rid, baseRun.id)
            setTriggered(true)
            toast?.success('AI analysis queued', 'Results appear in ~30 seconds.')
        } catch (e) {
            toast?.error('Analysis failed', e.response?.data?.message ?? 'Try again.')
        } finally { setTriggering(false) }
    }

    const isFailed = ['failed', 'failure', 'FAILED', 'FAILURE'].includes(baseRun?.status ?? '')

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200
                    ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden
            />

            {/* Drawer panel */}
            <aside
                ref={drawerRef}
                className={`
          fixed inset-y-0 right-0 z-50 w-full max-w-xl
          bg-white dark:bg-gray-900
          border-l border-gray-200 dark:border-gray-800
          shadow-2xl flex flex-col
          transition-transform duration-300 ease-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                                Run #{baseRun?.buildNumber ?? baseRun?.runNumber ?? baseRun?.id}
                            </h2>
                            {baseRun && <Badge status={(baseRun.status ?? '').toLowerCase()} />}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {baseRun?.workflowName ?? 'Pipeline'} · {baseRun?.repoName ?? ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {baseRun?.htmlUrl && (
                            <a href={baseRun.htmlUrl} target="_blank" rel="noreferrer"
                                className="btn-ghost p-1.5 rounded-lg" title="Open in GitHub">
                                <ExternalLink size={15} />
                            </a>
                        )}
                        <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
                            <X size={17} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {!baseRun ? (
                        <div className="flex items-center justify-center py-20">
                            <Spinner size="lg" />
                        </div>
                    ) : (
                        <div className="p-6 space-y-6">

                            {/* Commit message */}
                            {baseRun.commitMessage && (
                                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                                    <GitCommit size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {baseRun.commitMessage}
                                    </p>
                                </div>
                            )}

                            {/* Meta */}
                            <section>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                    Run Details
                                </p>
                                <MetaGrid run={baseRun} />
                            </section>

                            {/* Stage timeline */}
                            {(baseRun.stages?.length > 0 || baseRun.pipelineStages?.length > 0) && (
                                <section>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                        Stage Timeline
                                    </p>
                                    <StageTimeline stages={baseRun.stages ?? baseRun.pipelineStages} />
                                </section>
                            )}

                            {/* Failure details (raw) */}
                            {isFailed && baseRun.failureReason && !analysis && (
                                <section>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        Failure Output
                                    </p>
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                                        <pre className="font-mono text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                                            {baseRun.failureReason}
                                        </pre>
                                    </div>
                                </section>
                            )}

                            {/* AI Analysis */}
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        AI Diagnosis
                                    </p>
                                    {loadingA && <Spinner size="sm" />}
                                </div>
                                <AnalysisPanel
                                    analysis={analysis}
                                    onTrigger={handleTrigger}
                                    triggering={triggering}
                                    triggered={triggered}
                                    demoMode={demoMode}
                                />
                            </section>

                            {/* Timing summary */}
                            {baseRun.startedAt && (
                                <section className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <Clock size={12} />
                                        Started {formatDistanceToNow(new Date(baseRun.startedAt), { addSuffix: true })}
                                        {baseRun.completedAt && (
                                            <>
                                                {' · '}
                                                Completed {formatDistanceToNow(new Date(baseRun.completedAt), { addSuffix: true })}
                                            </>
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </aside>
        </>
    )
}