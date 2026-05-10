// ═══════════════════════════════════════════════════════════════════════════════
// src/pages/Insights.jsx  — thin: delegates to ai/ components
// ═══════════════════════════════════════════════════════════════════════════════
import { Brain, RefreshCw, Sparkles } from 'lucide-react'
import { useAiInsights } from '@/hooks/useAiInsights'
import { useRuns } from '@/hooks/useRuns'
import { useRepositories } from '@/hooks/useRepositories'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorBanner } from '@/components/ui'
import { ScoreGauge } from '@/components/ai/ScoreGauge'
import { StageRadar } from '@/components/ai/StageRadar'
import { InsightCard } from '@/components/ai/InsightCard'
import { TriggerPanel } from '@/components/ai/TriggerPanel'

const MOCK_INSIGHTS = [
    { severity: 'critical', stage: 'Test', title: 'Flaky Tests Causing 68% of Failures', summary: 'NullPointerException in CicdAnalyzerServiceTest — 14× in last 20 runs.', detail: 'Race condition in async test setup. Spring context not initialized before assertions run.', recommendation: 'Add @DirtiesContext or use Awaitility. Upgrade Spring Boot to 3.2.x.' },
    { severity: 'warning', stage: 'Build', title: 'Build Time ↑ 40% over 7 Days', summary: 'Maven build time: 85s → 120s. Dependency cache not persisting across builds.', detail: 'Remote Maven repository hit on every build. Docker layer cache invalidated.', recommendation: 'Mount ~/.m2 as a Docker volume or use GitHub Actions cache for .m2/repository.' },
    { severity: 'warning', stage: 'Deploy', title: 'Deployments Fail 3× More on Fridays', summary: 'Deploy failure rate spikes Friday 14:00–18:00 UTC.', detail: 'DB migrations timeout under peak staging load. Health check fails before migration done.', recommendation: 'Increase migration timeout 30s → 120s. Add pre-deploy readiness probe.' },
    { severity: 'info', stage: 'Docker', title: 'Image Size Growing +12% / Week', summary: 'Image grew 380MB → 512MB over 3 weeks. No .dockerignore.', detail: 'COPY . . copies node_modules and .git into the image.', recommendation: 'Add .dockerignore, switch to multi-stage build. Target ~180MB.' },
]

function InsightSkeleton() {
    return Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card p-4 space-y-2.5 animate-pulse">
            <div className="flex gap-2"><div className="skeleton h-5 w-16 rounded-full" /><div className="skeleton h-4 w-20 rounded" /></div>
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-3 w-full rounded" />
        </div>
    ))
}

export default function Insights() {
    const { insights, loading, error, refetch } = useAiInsights(null)
    const { repos } = useRepositories()
    const { runs } = useRuns({})

    const display = insights?.length ? insights : MOCK_INSIGHTS
    const critCount = display.filter(i => (i.severity ?? '').toLowerCase() === 'critical').length
    const score = insights?.length
        ? Math.max(10, Math.min(99, 100 - critCount * 18 - (display.length - critCount) * 6))
        : 68

    return (
        <div className="space-y-6">

            {/* Banner */}
            <div className="card p-5 bg-gradient-to-r from-brand-600 to-indigo-700 border-0 text-white">
                <div className="flex items-center gap-3 mb-1">
                    <Brain size={22} />
                    <h2 className="text-lg font-bold">AI Pipeline Intelligence</h2>
                    {loading && <Spinner size="sm" className="border-white/30 border-t-white ml-auto" />}
                </div>
                <p className="text-brand-100 text-sm max-w-xl">
                    Detects failure patterns, correlates root causes, and predicts pipeline risk.
                    Powered by your <code className="font-mono text-brand-200 text-xs bg-white/10 px-1.5 py-0.5 rounded">
                        POST /api/v1/repositories/:id/runs/:id/analyse</code> endpoint.
                </p>
            </div>

            {error && <ErrorBanner message={error} onRetry={refetch} />}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Left panel */}
                <div className="space-y-5">
                    <div className="card p-5 flex flex-col items-center gap-4">
                        <h3 className="section-title self-start">Pipeline Health Score</h3>
                        <ScoreGauge score={score} />
                    </div>

                    <div className="card p-5">
                        <h3 className="section-title mb-3">Stage Health Radar</h3>
                        <StageRadar />
                    </div>

                    {/* Prediction signals */}
                    <div className="card p-5">
                        <h3 className="section-title mb-4">Prediction Signals</h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Failure prob. (next run)', value: '34%', cls: 'text-amber-600 dark:text-amber-400' },
                                { label: 'Most likely failing stage', value: 'Test', cls: 'text-red-600   dark:text-red-400' },
                                { label: 'Est. MTTR', value: '18m', cls: 'text-brand-600 dark:text-brand-400' },
                                { label: 'Flaky test probability', value: '62%', cls: 'text-amber-600 dark:text-amber-400' },
                                { label: 'Health trend (7 days)', value: '↑ worse', cls: 'text-red-600   dark:text-red-400' },
                            ].map(({ label, value, cls }) => (
                                <div key={label} className="flex items-center justify-between text-sm py-0.5">
                                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                                    <span className={`font-semibold ${cls}`}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <TriggerPanel repos={repos} runs={runs} onTriggered={refetch} />
                </div>

                {/* Right: insight list */}
                <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className="section-title flex items-center gap-2 flex-wrap">
                            Detected Issues
                            {critCount > 0 && <span className="badge-danger">{critCount} critical</span>}
                            {!loading && !insights?.length && (
                                <span className="badge-neutral text-xs">demo data</span>
                            )}
                        </h3>
                        <button className="btn-secondary btn-sm" onClick={refetch} disabled={loading}>
                            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Re-analyse
                        </button>
                    </div>

                    {loading && <InsightSkeleton />}

                    {!loading && display.length === 0 && (
                        <div className="card p-12 text-center">
                            <Sparkles size={36} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                            <p className="font-medium text-gray-700 dark:text-gray-300">No issues detected</p>
                            <p className="muted text-xs mt-1">Use the trigger panel to run AI analysis on a failed pipeline.</p>
                        </div>
                    )}

                    {!loading && display.map((ins, i) => (
                        <InsightCard key={ins.runId ?? ins.title ?? i} insight={ins} />
                    ))}
                </div>
            </div>
        </div>
    )
}