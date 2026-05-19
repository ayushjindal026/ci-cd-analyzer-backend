// ═══════════════════════════════════════════════════════════════════════════════
// src/components/ai/TriggerPanel.jsx
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Zap, CheckCircle2 } from 'lucide-react'
import { runApi } from '@/api/client'
import { useToast } from '@/components/ui/Toast'
import { Spinner } from '@/components/ui/Spinner'

export function TriggerPanel({ repos = [], runs = [], onTriggered }) {
    const { toast } = useToast()
    const [selRepo, setSelRepo] = useState('')
    const [selRun, setSelRun] = useState('')
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)

    const failedRuns = runs.filter(r => {
        const status = (r.status ?? '').toUpperCase()
        const matches = !selRepo || String(r.repositoryId ?? r.repositoryId) === selRepo
        return matches && ['FAILED', 'FAILURE'].includes(status)
    })

    const handle = async () => {
        if (!selRepo || !selRun) return
        setLoading(true)
        try {
            await runApi.analyse(selRepo, selRun)
            setDone(true)
            toast.success('AI analysis queued', 'Results will appear in the insights list shortly.')
            onTriggered?.()
        } catch (e) {
            toast.error('Analysis failed', e.response?.data?.message ?? 'Could not trigger analysis.')
        } finally { setLoading(false) }
    }

    return (
        <div className="card p-5 space-y-3">
            <div>
                <h3 className="section-title">Trigger AI Analysis</h3>
                <p className="muted text-xs mt-0.5">Send a failed run through the AI diagnostic engine.</p>
            </div>

            {done && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-2.5">
                    <CheckCircle2 size={13} />
                    Analysis queued — reload Insights in ~30s to see results.
                </div>
            )}

            <select
                className="input text-sm"
                value={selRepo}
                onChange={e => { setSelRepo(e.target.value); setSelRun(''); setDone(false) }}
            >
                <option value="">Select repository…</option>
                {repos.map(r => (
                    <option key={r.id} value={r.id}>{r.fullName ?? r.name}</option>
                ))}
            </select>

            <select
                className="input text-sm"
                value={selRun}
                onChange={e => setSelRun(e.target.value)}
                disabled={!selRepo}
            >
                <option value="">
                    {selRepo
                        ? failedRuns.length ? 'Select failed run…' : 'No failed runs found'
                        : 'Select repo first…'}
                </option>
                {failedRuns.map(r => (
                    <option key={r.id} value={r.id}>
                        #{r.buildNumber ?? r.id} · {r.branch ?? 'main'}{r.repoName ? ` · ${r.repoName}` : ''}
                    </option>
                ))}
            </select>

            <button
                className="btn-primary w-full"
                onClick={handle}
                disabled={!selRepo || !selRun || loading || done}
            >
                {loading
                    ? <><Spinner size="sm" /> Analysing…</>
                    : <><Zap size={14} /> Run AI Analysis</>}
            </button>
        </div>
    )
}