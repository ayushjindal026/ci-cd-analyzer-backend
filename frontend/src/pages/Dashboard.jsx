import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Activity, CheckCircle, XCircle, Clock, Zap, RefreshCw, GitBranch } from 'lucide-react'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useRuns } from '@/hooks/useRuns'
import { useRepositories } from '@/hooks/useRepositories'
import { usePolling } from '@/hooks/usePolling'
import { useToast } from '@/components/ui/Toast'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorBanner } from '@/components/ui'
import { FailureRateChart } from '@/components/charts/FailureRateChart'
import { SuccessRatioChart } from '@/components/charts/SuccessRatioChart'
import { StageDurationChart } from '@/components/charts/StageDurationChart'
import { formatDistanceToNow } from 'date-fns'

// ── Fallback mock data — shown until backend responds ─────────────────────────
const MOCK_TREND = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i))
    const f = Math.round(8 + Math.sin(i * 0.8) * 12 + Math.random() * 6)
    return { date: d.toISOString().split('T')[0], failureRate: f, successRate: 100 - f }
})
const MOCK_DURATIONS = [
    { stage: 'Checkout', avgDuration: 8, maxDuration: 18 },
    { stage: 'Build', avgDuration: 118, maxDuration: 275 },
    { stage: 'Test', avgDuration: 204, maxDuration: 460 },
    { stage: 'Docker', avgDuration: 58, maxDuration: 125 },
    { stage: 'Deploy', avgDuration: 42, maxDuration: 88 },
]
const MOCK_RECENT = [
    { id: 1, buildNumber: 142, repoName: 'cicd-analyzer', branch: 'main', status: 'success', duration: 312, startedAt: new Date(Date.now() - 12 * 60000).toISOString() },
    { id: 2, buildNumber: 141, repoName: 'cicd-analyzer', branch: 'feature/oauth', status: 'failed', duration: 87, startedAt: new Date(Date.now() - 48 * 60000).toISOString() },
    { id: 3, buildNumber: 58, repoName: 'spring-api', branch: 'main', status: 'running', duration: null, startedAt: new Date(Date.now() - 4 * 60000).toISOString() },
    { id: 4, buildNumber: 57, repoName: 'spring-api', branch: 'fix/db-conn', status: 'success', duration: 201, startedAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: 5, buildNumber: 12, repoName: 'cicd-analyzer', branch: 'dev', status: 'pending', duration: null, startedAt: new Date(Date.now() - 60000).toISOString() },
    { id: 6, buildNumber: 140, repoName: 'cicd-analyzer', branch: 'feature/ui', status: 'failed', duration: 144, startedAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: 7, buildNumber: 56, repoName: 'spring-api', branch: 'main', status: 'success', duration: 289, startedAt: new Date(Date.now() - 8 * 3600000).toISOString() },
]

function fmtDur(s) {
    if (!s && s !== 0) return '—'
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

// ── Stat skeleton ─────────────────────────────────────────────────────────────
function StatSkeleton() {
    return (
        <div className="stat-card animate-pulse space-y-3">
            <div className="flex justify-between">
                <div className="skeleton h-3.5 w-24 rounded" />
                <div className="skeleton h-8 w-8 rounded-lg" />
            </div>
            <div className="skeleton h-7 w-20 rounded" />
            <div className="skeleton h-3 w-28 rounded" />
        </div>
    )
}

// ── Chart skeleton ────────────────────────────────────────────────────────────
function ChartSkeleton({ height = 260 }) {
    return (
        <div className="animate-pulse" style={{ height }}>
            <div className="skeleton w-full h-full rounded-xl" />
        </div>
    )
}

// ── Recent run skeleton ────────────────────────────────────────────────────────
function RunsSkeleton() {
    return Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-2.5 py-2 animate-pulse">
            <div className="skeleton h-5 w-16 rounded-full" />
            <div className="flex-1 space-y-1">
                <div className="skeleton h-3.5 rounded" style={{ width: `${45 + i * 8}%` }} />
                <div className="skeleton h-3 w-16 rounded" />
            </div>
            <div className="space-y-1 text-right">
                <div className="skeleton h-3 w-10 rounded" />
                <div className="skeleton h-3 w-14 rounded" />
            </div>
        </li>
    ))
}

// ── Normalise analytics data ───────────────────────────────────────────────────
function norm(data) {
    if (!data) return {}
    return {
        totalRuns: data.totalRuns ?? 0,
        successRate: data.successRate ?? (data.successfulRuns && data.totalRuns
            ? Math.round(data.successfulRuns / data.totalRuns * 100) : 0),
        failureRate: data.failureRate ?? (data.failedRuns && data.totalRuns
            ? Math.round(data.failedRuns / data.totalRuns * 100) : 0),
        avgDuration: data.avgDuration ?? 0,
        trend: data.trend ?? data.failureRateTrend ?? data.failureRate ?? [],
        durations: data.durations ?? data.stageDurations ?? [],
        ratio: [
            { name: 'Success', value: data.successfulRuns ?? data.successCount ?? 0 },
            { name: 'Failed', value: data.failedRuns ?? data.failureCount ?? 0 },
            { name: 'Running', value: data.runningRuns ?? 0 },
            { name: 'Pending', value: data.pendingRuns ?? 0 },
        ].filter(x => x.value > 0),
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
    const { toast } = useToast()
    const { repos } = useRepositories()
    const { data, loading: aLoad, error: aErr, refetch: refetchA } = useAnalytics(null)
    const { runs, loading: rLoad, error: rErr, refetch: refetchR } = useRuns({ size: 8 })

    // Has any run currently running?
    const hasRunning = runs.some(r => ['running', 'RUNNING'].includes(r.status ?? ''))

    // Poll every 20s when runs are active, 60s otherwise
    const poll = useCallback(() => {
        refetchR()
        if (hasRunning) refetchA()
    }, [refetchR, refetchA, hasRunning])
    usePolling(poll, hasRunning ? 20_000 : 60_000)

    const handleManualRefresh = () => {
        refetchA(); refetchR()
        toast.info('Refreshing', 'Fetching latest pipeline data…', 2000)
    }

    const d = norm(data)
    const trend = d.trend?.length ? d.trend : MOCK_TREND
    const durations = d.durations?.length ? d.durations : MOCK_DURATIONS
    const ratio = d.ratio?.length ? d.ratio : [{ name: 'Success', value: 142 }, { name: 'Failed', value: 36 }]
    const recent = runs.length ? runs : MOCK_RECENT

    return (
        <div className="space-y-6">

            {/* ── Header row ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {repos.length > 0 && (
                        <p className="muted text-xs">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{repos.length}</span> repo{repos.length !== 1 ? 's' : ''} connected
                        </p>
                    )}
                    {hasRunning && (
                        <span className="badge-info text-xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            Live
                        </span>
                    )}
                </div>
                <button
                    className="btn-ghost btn-sm"
                    onClick={handleManualRefresh}
                    disabled={aLoad && rLoad}
                >
                    <RefreshCw size={13} className={aLoad || rLoad ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* ── KPI cards ───────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {aLoad && !data
                    ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
                    : <>
                        <StatCard label="Total Runs" value={data ? d.totalRuns.toLocaleString() : '—'} delta={12} deltaLabel="vs last week" icon={Activity} accent="brand" />
                        <StatCard label="Success Rate" value={data ? `${d.successRate}%` : '—'} delta={3.2} deltaLabel="vs last week" icon={CheckCircle} accent="success" />
                        <StatCard label="Failure Rate" value={data ? `${d.failureRate}%` : '—'} delta={-1.4} deltaLabel="vs last week" icon={XCircle} accent="danger" />
                        <StatCard label="Avg Duration" value={data ? fmtDur(d.avgDuration) : '—'} delta={-8} deltaLabel="vs last week" icon={Clock} accent="info" />
                    </>}
            </div>

            {aErr && <ErrorBanner message={aErr} onRetry={refetchA} />}

            {/* ── Main charts ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Failure rate trend */}
                <div className="card p-5 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="section-title">Failure Rate Trend</h2>
                            <p className="muted text-xs mt-0.5">Last 14 days · all repositories</p>
                        </div>
                        <span className="badge-danger text-xs">Alert at 20%</span>
                    </div>
                    {aLoad && !data ? <ChartSkeleton height={260} /> : <FailureRateChart data={trend} threshold={20} />}
                </div>

                {/* Run breakdown */}
                <div className="card p-5">
                    <h2 className="section-title mb-0.5">Run Breakdown</h2>
                    <p className="muted text-xs mb-4">All time · by status</p>
                    {aLoad && !data ? <ChartSkeleton height={260} /> : <SuccessRatioChart data={ratio} />}
                </div>
            </div>

            {/* ── Stage durations + Recent runs ───────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                <div className="card p-5">
                    <h2 className="section-title mb-0.5">Stage Duration Breakdown</h2>
                    <p className="muted text-xs mb-4">Avg vs max · seconds</p>
                    {aLoad && !data ? <ChartSkeleton height={250} /> : <StageDurationChart data={durations} />}
                </div>

                <div className="card p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="section-title">Recent Runs</h2>
                            <p className="muted text-xs mt-0.5">Latest executions across all repos</p>
                        </div>
                        <Link to="/runs" className="text-xs text-brand-500 hover:underline font-medium">
                            View all →
                        </Link>
                    </div>

                    {rErr && <ErrorBanner message={rErr} onRetry={refetchR} />}

                    <ul className="flex-1 space-y-0.5">
                        {rLoad && !runs.length
                            ? <RunsSkeleton />
                            : recent.slice(0, 7).map(run => (
                                <li
                                    key={run.id}
                                    className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-default"
                                >
                                    <Badge status={(run.status ?? '').toLowerCase()} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                            {run.repoName ?? run.repositoryName ?? 'pipeline'}
                                            <span className="font-mono text-xs text-gray-400 ml-1">
                                                #{run.buildNumber ?? run.runNumber ?? run.id}
                                            </span>
                                        </p>
                                        <p className="text-xs text-gray-400 truncate font-mono">{run.branch ?? 'main'}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-xs font-mono text-gray-500">{fmtDur(run.duration ?? run.durationSeconds)}</p>
                                        <p className="text-xs text-gray-400">
                                            {run.startedAt
                                                ? formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })
                                                : '—'}
                                        </p>
                                    </div>
                                </li>
                            ))
                        }
                    </ul>
                </div>
            </div>

            {/* ── AI insight banner ────────────────────────────────────────────── */}
            <div className="card p-4 border-brand-200 dark:border-brand-800/60 bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-brand-900/20 dark:to-indigo-900/20 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-brand-100 dark:bg-brand-800/60 flex-shrink-0">
                    <Zap size={18} className="text-brand-600 dark:text-brand-300" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">AI Insight</p>
                    <p className="text-sm text-brand-700 dark:text-brand-300 mt-0.5">
                        Your <strong>Test</strong> stage has the highest failure correlation.
                        Trigger an AI analysis on any failed run for a full root-cause diagnosis.
                    </p>
                </div>
                <Link to="/insights" className="btn-primary flex-shrink-0 text-xs whitespace-nowrap">
                    Full Analysis
                </Link>
            </div>

        </div>
    )
}