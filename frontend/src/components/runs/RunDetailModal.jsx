// ═══════════════════════════════════════════════════════════════════════════════
// src/components/runs/RunDetailModal.jsx
// Full run detail with stage timeline, AI analysis, trigger button
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { Zap } from 'lucide-react'
import { format } from 'date-fns'
import { useRunDetail } from '@/hooks/useRuns'
import { runApi } from '@/api/client'
import { useToast } from '@/components/ui/Toast'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'

function fmtDur(s) {
    if (!s && s !== 0) return '—'
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

export function RunDetailModal({ run: baseRun, open, onClose }) {
    const { toast } = useToast()
    const repositoryId = baseRun?.repositoryId ?? baseRun?.repositoryId
    const runId = baseRun?.id
    const { run, analysis, loading } = useRunDetail(repositoryId, runId)
    const display = run ?? baseRun

    const [triggering, setTriggering] = useState(false)
    const [triggered, setTriggered] = useState(false)

    useEffect(() => { setTriggered(false) }, [runId])

    const isFailed = ['failed', 'failure', 'FAILED', 'FAILURE'].includes(display?.status ?? '')

    const handleAnalyse = async () => {
        if (!repositoryId || !runId) return
        setTriggering(true)
        try {
            await runApi.analyse(repositoryId, runId)
            setTriggered(true)
            toast.success('AI analysis queued', 'Results will appear in the Insights page shortly.')
        } catch (e) {
            toast.error('Analysis failed', e.response?.data?.message ?? 'Could not trigger analysis.')
        } finally { setTriggering(false) }
    }

    const stages = display?.stages ?? display?.pipelineStages ?? []
    const maxDur = stages.length
        ? Math.max(...stages.map(s => s.duration ?? s.durationSeconds ?? 0), 1)
        : 1

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="lg"
            title={display ? `Run #${display.buildNumber ?? display.runNumber ?? display.id}` : 'Loading…'}
            footer={
                <div className="flex items-center justify-between w-full gap-3">
                    {isFailed && (
                        <button
                            className="btn-primary btn-sm"
                            onClick={handleAnalyse}
                            disabled={triggering || triggered}
                        >
                            {triggering ? <><Spinner size="sm" /> Analysing…</> :
                                triggered ? '✓ Analysis queued' :
                                    <><Zap size={13} /> AI Diagnosis</>}
                        </button>
                    )}
                    <button className="btn-secondary ml-auto" onClick={onClose}>Close</button>
                </div>
            }
        >
            {loading
                ? <div className="flex justify-center py-10"><Spinner size="lg" /></div>
                : display && (
                    <div className="space-y-5">

                        {/* Meta */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                                ['Status', <Badge status={(display.status ?? '').toLowerCase()} />],
                                ['Branch', <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{display.branch ?? 'main'}</code>],
                                ['Commit', <code className="font-mono text-xs">{(display.commitSha ?? display.commit ?? '').slice(0, 7) || '—'}</code>],
                                ['Duration', fmtDur(display.duration ?? display.durationSeconds)],
                                ['Trigger', display.trigger ?? display.triggeredBy ?? 'push'],
                                ['Started', display.startedAt ? format(new Date(display.startedAt), 'MMM d, HH:mm:ss') : '—'],
                            ].map(([k, v]) => (
                                <div key={k} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{k}</p>
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{v}</div>
                                </div>
                            ))}
                        </div>

                        {/* Stage timeline */}
                        {stages.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Stage Timeline</p>
                                <div className="space-y-2.5">
                                    {stages.map((s, i) => {
                                        const st = (s.status ?? '').toUpperCase()
                                        const dur = s.duration ?? s.durationSeconds ?? 0
                                        const bar =
                                            st === 'SUCCESS' ? 'bg-emerald-500' :
                                                st === 'FAILED' ? 'bg-red-500' :
                                                    st === 'RUNNING' ? 'bg-blue-500 animate-pulse' : 'bg-gray-200 dark:bg-gray-700'
                                        return (
                                            <div key={i} className="flex items-center gap-3">
                                                <Badge status={st.toLowerCase()} />
                                                <span className="text-sm text-gray-800 dark:text-gray-100 w-24 flex-shrink-0 truncate">{s.name}</span>
                                                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                                                    <div className={`${bar} h-2 rounded-full transition-all duration-500`}
                                                        style={{ width: `${Math.max(2, (dur / maxDur) * 100)}%` }} />
                                                </div>
                                                <span className="font-mono text-xs text-gray-400 w-12 text-right flex-shrink-0">{fmtDur(dur)}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* AI Analysis result */}
                        {analysis && (
                            <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl p-4 space-y-2">
                                <p className="text-xs font-semibold text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
                                    <Zap size={12} /> AI Analysis
                                </p>
                                <p className="text-sm text-brand-800 dark:text-brand-200 leading-relaxed">
                                    {analysis.summary ?? analysis.diagnosis ?? analysis.result ?? JSON.stringify(analysis)}
                                </p>
                                {analysis.recommendation && (
                                    <div className="pt-2 border-t border-brand-200 dark:border-brand-700">
                                        <p className="text-xs font-semibold text-brand-700 dark:text-brand-300 mb-0.5">💡 Recommendation</p>
                                        <p className="text-xs text-brand-700 dark:text-brand-300 leading-relaxed">{analysis.recommendation}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Failure info */}
                        {isFailed && !analysis && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Failure Details</p>
                                <p className="font-mono text-xs text-red-600 dark:text-red-300 leading-relaxed">
                                    {display.failureReason ?? display.errorMessage
                                        ?? 'No error message captured. Click "AI Diagnosis" to run root-cause analysis.'}
                                </p>
                            </div>
                        )}
                    </div>
                )
            }
        </Modal>
    )
}