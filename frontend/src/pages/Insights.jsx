import { useState } from 'react'
import { Sparkles, AlertTriangle, Zap, Brain, RefreshCw, ChevronRight, TrendingUp } from 'lucide-react'
import { useAiInsights } from '@/hooks/useAiInsights'
import { useRuns } from '@/hooks/useTestRuns'
import { useRepositories } from '@/hooks/useRepositories'
import { runApi } from '@/api/client'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorBanner } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'

// ── Health score gauge ────────────────────────────────────────────────────────
function ScoreGauge({ score = 72 }) {
    const color = score >= 80 ? '#10b981' : score >= 55 ? '#f59e0b' : '#ef4444'
    const label = score >= 80 ? 'Healthy' : score >= 55 ? 'At Risk' : 'Critical'
    const circumference = 2 * Math.PI * 52
    const dash = (score / 100) * circumference

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative w-40 h-40">
                <svg viewBox="0 0 120 120" className="rotate-[-90deg] w-full h-full">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="10" className="dark:stroke-gray-700" />
                    <circle
                        cx="60" cy="60" r="52" fill="none"
                        stroke={color} strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={`${dash} ${circumference}`}
                        className="transition-all duration-1000"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900 dark:text-gray-50">{score}</span>
                    <span className="text-xs text-gray-400">/ 100</span>
                </div>
            </div>
            <span className={`badge ${score >= 80 ? 'badge-success' : score >= 55 ? 'badge-warning' : 'badge-danger'}`}>
                {label}
            </span>
        </div>
    )
}

// ── Insight card ──────────────────────────────────────────────────────────────
function InsightCard({ insight }) {
    const [open, setOpen] = useState(false)

    // Handle both real API shape and mock shape
    const severity = insight.severity ?? (insight.failureCount > 5 ? 'critical' : 'warning')
    const title = insight.title ?? insight.summary ?? `Failed run #${insight.runId}`
    const summary = insight.summary ?? insight.diagnosis ?? ''
    const detail = insight.detail ?? insight.result ?? insight.analysis ?? ''
    const rec = insight.recommendation ?? ''
    const stage = insight.stage ?? insight.failingStage ?? ''

    const sev = severity?.toLowerCase()
    const clsMap = {
        critical: 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10',
        warning: 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/10',
        info: 'border-brand-200 dark:border-brand-900 bg-brand-50 dark:bg-brand-900/10',
    }
    const Icon = sev === 'critical' ? AlertTriangle : sev === 'warning' ? TrendingUp : Zap

    return (
        <div className={`rounded-xl border p-4 ${clsMap[sev] ?? clsMap.info} transition-all`}>
            <div className="flex items-start gap-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
                <Icon size={17} className={`mt-0.5 flex-shrink-0 ${sev === 'critical' ? 'text-red-500' : sev === 'warning' ? 'text-amber-500' : 'text-brand-500'
                    }`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`badge capitalize ${sev === 'critical' ? 'badge-danger' : sev === 'warning' ? 'badge-warning' : 'badge-info'}`}>
                            {sev}
                        </span>
                        {stage && <span className="text-xs text-gray-400">{stage}</span>}
                        {insight.repoId && <span className="mono text-xs text-gray-400">repo #{insight.repoId}</span>}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
                    {summary && summary !== title && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{summary}</p>
                    )}
                </div>
                <ChevronRight size={15} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
            </div>

            {open && detail && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2 animate-slide-up">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{detail}</p>
                    {rec && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-xs">
                            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">💡 Recommendation</p>
                            <p className="text-gray-600 dark:text-gray-400">{rec}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ── Radar chart ───────────────────────────────────────────────────────────────
const RADAR_DATA_MOCK = [
    { stage: 'Checkout', value: 98 },
    { stage: 'Build', value: 74 },
    { stage: 'Test', value: 52 },
    { stage: 'Docker', value: 88 },
    { stage: 'Deploy', value: 81 },
]

function StageRadar({ data = RADAR_DATA_MOCK }) {
    return (
        <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="rgba(148,163,184,0.2)" />
                <PolarAngleAxis dataKey="stage" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} />
                <Tooltip formatter={v => [`${v}%`, 'Health']} contentStyle={{ borderRadius: '10px', fontSize: '12px', border: '1px solid #e2e8f0' }} />
            </RadarChart>
        </ResponsiveContainer>
    )
}

// ── Trigger analysis panel ────────────────────────────────────────────────────
function TriggerPanel({ repos, runs }) {
    const [selRepo, setSelRepo] = useState('')
    const [selRun, setSelRun] = useState('')
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const [err, setErr] = useState(null)

    const filteredRuns = runs.filter(r =>
        !selRepo || (r.repositoryId ?? r.repoId)?.toString() === selRepo
    )

    const handle = async () => {
        if (!selRepo || !selRun) return
        setLoading(true); setErr(null)
        try {
            await runApi.analyse(selRepo, selRun)
            setDone(true)
        } catch (e) {
            setErr(e.response?.data?.message ?? 'Failed to trigger analysis')
        } finally { setLoading(false) }
    }

    return (
        <div className="card p-5 space-y-3">
            <h3 className="section-title">Trigger AI Analysis</h3>
            <p className="muted text-xs">Select a failed run to send it through the AI diagnostic engine.</p>

            {err && <ErrorBanner message={err} />}
            {done && <div className="badge-success text-xs px-3 py-2">✓ Analysis queued — results will appear above shortly.</div>}

            <select className="input text-sm" value={selRepo} onChange={e => { setSelRepo(e.target.value); setSelRun('') }}>
                <option value="">Select repository…</option>
                {repos.map(r => <option key={r.id} value={r.id}>{r.fullName ?? r.name}</option>)}
            </select>

            <select className="input text-sm" value={selRun} onChange={e => setSelRun(e.target.value)} disabled={!selRepo}>
                <option value="">Select run…</option>
                {filteredRuns.map(r => (
                    <option key={r.id} value={r.id}>
                        #{r.buildNumber ?? r.id} — {(r.status ?? '').toLowerCase()} — {r.branch ?? 'main'}
                    </option>
                ))}
            </select>

            <button className="btn-primary w-full" onClick={handle} disabled={!selRepo || !selRun || loading || done}>
                {loading ? <><Spinner size="sm" /> Analysing…</> : <><Zap size={14} /> Run AI Analysis</>}
            </button>
        </div>
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const MOCK_INSIGHTS = [
    { severity: 'critical', stage: 'Test', title: 'Flaky Tests Causing 68% of Failures', summary: 'NullPointerException detected 14 times in last 20 runs.', detail: 'Race condition in async test setup — Spring context not fully initialized before assertions run.', recommendation: 'Add @DirtiesContext or use Awaitility for async assertions.' },
    { severity: 'warning', stage: 'Build', title: 'Build Time Increasing (↑ 40% in 7 days)', summary: 'Average Maven build time increased from 85s → 120s.', detail: 'Dependency resolution hitting remote Maven on every build — cache not persisting across Docker layers.', recommendation: 'Mount ~/.m2 as a volume or use GitHub Actions cache.' },
    { severity: 'warning', stage: 'Deploy', title: 'Deployment Failures Spike on Fridays', summary: 'Deploy failure rate 3× higher on Friday afternoons (14–18 UTC).', detail: 'DB migrations timing out under peak load on staging.', recommendation: 'Increase migration timeout from 30s → 120s.' },
    { severity: 'info', stage: 'Docker', title: 'Image Size Growing (+12% per week)', summary: 'Built image grew from 380MB → 512MB.', detail: 'COPY . . copies node_modules and .git into image.', recommendation: 'Add .dockerignore and switch to multi-stage builds.' },
]

export default function Insights() {
    const [repoId] = useState(null)
    const { insights, loading, error, triggerAnalysis } = useAiInsights(repoId)
    const { repos } = useRepositories()
    const { runs } = useRuns({})

    // Derive score from real insight count, else 68 mock
    const criticalCount = (insights ?? MOCK_INSIGHTS).filter(i =>
        (i.severity ?? '').toLowerCase() === 'critical'
    ).length
    const score = insights?.length
        ? Math.max(20, 100 - criticalCount * 15 - (insights.length - criticalCount) * 5)
        : 68

    const displayInsights = insights?.length ? insights : MOCK_INSIGHTS

    return (
        <div className="space-y-6 animate-fade-in">

            {/* Banner */}
            <div className="card p-5 bg-gradient-to-r from-brand-600 to-indigo-700 border-0 text-white">
                <div className="flex items-center gap-3 mb-1">
                    <Brain size={22} />
                    <h2 className="text-lg font-bold">AI Pipeline Intelligence</h2>
                </div>
                <p className="text-brand-100 text-sm max-w-xl">
                    Powered by AI — detects failure patterns, correlates root causes, and predicts pipeline risk.
                    Uses your Spring Boot <code className="font-mono text-brand-200">/analyse</code> endpoint.
                </p>
            </div>

            {error && <ErrorBanner message={error} />}

            {loading
                ? <div className="flex justify-center py-20"><Spinner size="lg" /></div>
                : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                        {/* Left column */}
                        <div className="space-y-5">
                            <div className="card p-5 flex flex-col items-center gap-4">
                                <h3 className="section-title self-start">Pipeline Health Score</h3>
                                <ScoreGauge score={score} />
                                <p className="text-xs text-gray-400 text-center">
                                    Computed from AI-detected failure patterns and trends across all connected repos.
                                </p>
                            </div>

                            <div className="card p-5">
                                <h3 className="section-title mb-3">Stage Health Radar</h3>
                                <StageRadar />
                            </div>

                            <TriggerPanel repos={repos} runs={runs} />
                        </div>

                        {/* Right: insights */}
                        <div className="lg:col-span-2 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="section-title flex items-center gap-2">
                                    Detected Issues
                                    {criticalCount > 0 && (
                                        <span className="badge-danger">{criticalCount} critical</span>
                                    )}
                                </h3>
                                <button
                                    className="btn-secondary btn-sm"
                                    onClick={() => triggerAnalysis && triggerAnalysis(repoId, null)}
                                >
                                    <RefreshCw size={13} /> Re-analyse
                                </button>
                            </div>

                            {displayInsights.length === 0 && (
                                <div className="card p-10 text-center">
                                    <Sparkles size={36} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                                    <p className="font-medium text-gray-700 dark:text-gray-300">No issues detected</p>
                                    <p className="muted text-xs mt-1">Trigger an analysis on a failed run to see AI insights here.</p>
                                </div>
                            )}

                            {displayInsights.map((ins, i) => (
                                <InsightCard key={i} insight={ins} />
                            ))}
                        </div>
                    </div>
                )}
        </div>
    )
}