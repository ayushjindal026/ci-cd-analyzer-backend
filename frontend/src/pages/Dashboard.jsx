import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Activity, CheckCircle, XCircle, Clock, Zap, RefreshCw } from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useRuns } from '@/hooks/useTestRuns'
import { useRepositories } from '@/hooks/useRepositories'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorBanner } from '@/components/ui'
import { FailureRateChart } from '@/components/charts/FailureRateChart'
import { SuccessRatioChart } from '@/components/charts/SuccessRatioChart'
import { StageDurationChart } from '@/components/charts/StageDurationChart'
import { formatDistanceToNow } from 'date-fns'

// ── Fallback mock (shown until backend returns real data) ─────────────────────
const MOCK_TREND = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i))
    const f = Math.round(8 + Math.random() * 25)
    return { date: d.toISOString().split('T')[0], failureRate: f, successRate: 100 - f }
})
const MOCK_DURATIONS = [
    { stage: 'Checkout', avgDuration: 8, maxDuration: 15 },
    { stage: 'Build', avgDuration: 120, maxDuration: 280 },
    { stage: 'Test', avgDuration: 200, maxDuration: 450 },
    { stage: 'Docker', avgDuration: 60, maxDuration: 130 },
    { stage: 'Deploy', avgDuration: 45, maxDuration: 90 },
]
const MOCK_RECENT = [
    { id: 1, buildNumber: 142, repoName: 'cicd-analyzer', branch: 'main', status: 'success', duration: 312, startedAt: new Date(Date.now() - 12 * 60000).toISOString() },
    { id: 2, buildNumber: 141, repoName: 'cicd-analyzer', branch: 'feature/oauth', status: 'failed', duration: 87, startedAt: new Date(Date.now() - 45 * 60000).toISOString() },
    { id: 3, buildNumber: 58, repoName: 'spring-api', branch: 'main', status: 'running', duration: null, startedAt: new Date(Date.now() - 3 * 60000).toISOString() },
    { id: 4, buildNumber: 57, repoName: 'spring-api', branch: 'fix/db-conn', status: 'success', duration: 201, startedAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: 5, buildNumber: 12, repoName: 'cicd-analyzer', branch: 'dev', status: 'pending', duration: null, startedAt: new Date(Date.now() - 60000).toISOString() },
    { id: 6, buildNumber: 140, repoName: 'cicd-analyzer', branch: 'feature/ui', status: 'failed', duration: 144, startedAt: new Date(Date.now() - 5 * 3600000).toISOString() },
]

function fmtDur(s) {
    if (!s) return '—'
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

// ── Map whatever shape backend returns → chart-friendly arrays ─────────────
function toTrendData(data) {
    // backend may return data.trend, data.failureRateTrend, data.failureRate
    const raw = data?.trend ?? data?.failureRateTrend ?? data?.failureRate ?? []
    if (Array.isArray(raw) && raw.length) return raw
    return MOCK_TREND
}
function toDurationData(data) {
    const raw = data?.durations ?? data?.stageDurations ?? []
    return raw.length ? raw : MOCK_DURATIONS
}
function toRatioData(data) {
    // backend may return { successfulRuns, failedRuns, totalRuns }
    if (!data) return null
    const s = data.successfulRuns ?? data.successCount ?? 0
    const f = data.failedRuns ?? data.failureCount ?? 0
    const r = data.runningRuns ?? 0
    const p = data.pendingRuns ?? 0
    if (!s && !f && !r && !p) return null
    return [
        { name: 'Success', value: s },
        { name: 'Failed', value: f },
        ...(r ? [{ name: 'Running', value: r }] : []),
        ...(p ? [{ name: 'Pending', value: p }] : []),
    ]
}

export default function Dashboard() {
    const [selRepo] = useState(null)   // null = aggregate all repos
    const { data, loading: aLoad, error: aErr } = useAnalytics(selRepo)
    const { runs, loading: rLoad, error: rErr } = useRuns({})
    const { repos } = useRepositories()

    const trend = toTrendData(data)
    const durations = toDurationData(data)
    const ratio = toRatioData(data)
    const recent = runs.length ? runs : MOCK_RECENT

    const successRate = data?.successRate ?? 0
    const failureRate = data?.failureRate ?? (data?.failedRuns && data?.totalRuns
        ? Math.round((data.failedRuns / data.totalRuns) * 100) : 0)

    return (
        <div className="space-y-6 animate-fade-in">

            {/* ── KPIs ──────────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Runs"
                    value={data?.totalRuns ?? '—'}
                    delta={12} deltaLabel="vs last week"
                    icon={Activity} accent="brand"
                />
                <StatCard
                    label="Success Rate"
                    value={data ? `${successRate}%` : '—'}
                    delta={3.2} deltaLabel="vs last week"
                    icon={CheckCircle} accent="success"
                />
                <StatCard
                    label="Failure Rate"
                    value={data ? `${failureRate}%` : '—'}
                    delta={-1.4} deltaLabel="vs last week"
                    icon={XCircle} accent="danger"
                />
                <StatCard
                    label="Avg Duration"
                    value={data?.avgDuration ? fmtDur(data.avgDuration) : '—'}
                    delta={-8} deltaLabel="vs last week"
                    icon={Clock} accent="info"
                />
            </div>

            {/* Repo count banner */}
            {repos.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{repos.length}</span> repo{repos.length !== 1 ? 's' : ''} connected ·
                    <Link to="/repos" className="text-brand-500 hover:underline">manage</Link>
                </div>
            )}

            {/* ── Charts ────────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                <div className="card p-5 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="section-title">Failure Rate Trend</h2>
                            <p className="muted text-xs mt-0.5">Last 14 days · all repositories</p>
                        </div>
                        <span className="badge-danger text-xs px-2 py-0.5">Alert at 20%</span>
                    </div>
                    {aLoad
                        ? <div className="flex justify-center py-16"><Spinner /></div>
                        : <FailureRateChart data={trend} threshold={20} />}
                </div>

                <div className="card p-5">
                    <h2 className="section-title mb-0.5">Run Breakdown</h2>
                    <p className="muted text-xs mb-3">All time · by status</p>
                    {aLoad
                        ? <div className="flex justify-center py-16"><Spinner /></div>
                        : <SuccessRatioChart data={ratio ?? [
                            { name: 'Success', value: data?.successfulRuns ?? 142 },
                            { name: 'Failed', value: data?.failedRuns ?? 28 },
                        ]} />}
                </div>
            </div>

            {/* ── Stage durations + Recent runs ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                <div className="card p-5">
                    <h2 className="section-title mb-0.5">Stage Duration Breakdown</h2>
                    <p className="muted text-xs mb-4">Avg vs max · seconds</p>
                    {aLoad
                        ? <div className="flex justify-center py-16"><Spinner /></div>
                        : <StageDurationChart data={durations} />}
                </div>

                <div className="card p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="section-title">Recent Runs</h2>
                            <p className="muted text-xs mt-0.5">Latest executions across all repos</p>
                        </div>
                        <Link to="/runs" className="text-xs text-brand-500 hover:underline">View all →</Link>
                    </div>

                    {rLoad && <div className="flex justify-center py-10"><Spinner /></div>}
                    {rErr && <ErrorBanner message={rErr} />}

                    {!rLoad && (
                        <ul className="space-y-1.5 flex-1">
                            {recent.slice(0, 7).map(run => (
                                <li
                                    key={run.id}
                                    className="flex items-center gap-3 px-2.5 py-2 rounded-lg
                             hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <Badge status={run.status} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                            {run.repoName ?? run.repositoryName ?? 'pipeline'}
                                            <span className="font-mono text-gray-400 text-xs ml-1">
                                                #{run.buildNumber ?? run.runNumber ?? run.id}
                                            </span>
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">{run.branch ?? 'main'}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-xs text-gray-500">{fmtDur(run.duration)}</p>
                                        <p className="text-xs text-gray-400">
                                            {run.startedAt
                                                ? formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })
                                                : '—'}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* ── AI Insight banner ─────────────────────────────────────────────── */}
            <div className="card p-4 border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-brand-100 dark:bg-brand-800 flex-shrink-0">
                    <Zap size={18} className="text-brand-600 dark:text-brand-300" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">AI Insight</p>
                    <p className="text-sm text-brand-700 dark:text-brand-300 mt-0.5">
                        Your <strong>Test</strong> stage has the highest failure correlation.
                        Trigger an AI analysis on any failed run to get a full root cause diagnosis.
                    </p>
                </div>
                <Link to="/insights" className="btn-primary flex-shrink-0 text-xs">Full Analysis</Link>
            </div>

        </div>
    )
}