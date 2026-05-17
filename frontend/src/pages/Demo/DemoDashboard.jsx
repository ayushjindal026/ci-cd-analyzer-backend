// ═══════════════════════════════════════════════════════════════════════════════
// src/pages/Demo/DemoDashboard.jsx
// ═══════════════════════════════════════════════════════════════════════════════
import { Link } from 'react-router-dom'
import { Activity, CheckCircle, XCircle, Clock, Zap } from 'lucide-react'
import { useDemo } from '@/demo/DemoContext'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { FailureRateChart } from '@/components/charts/FailureRateChart'
import { SuccessRatioChart } from '@/components/charts/SuccessRatioChart'
import { StageDurationChart } from '@/components/charts/StageDurationChart'
import { formatDistanceToNow } from 'date-fns'

function fmtDur(ms) {
    if (!ms && ms !== 0) return '—'
    const s = Math.floor(ms / 1000)
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

export function DemoDashboard() {
    const { metrics, runs, liveRuns } = useDemo()

    return (
        <div className="space-y-6">
            <DemoBadge />

            {/* Live indicator */}
            {liveRuns > 0 && (
                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    {liveRuns} pipeline{liveRuns > 1 ? 's' : ''} running live
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Runs" value={metrics.totalRuns.toLocaleString()} delta={8} deltaLabel="vs last week" icon={Activity} accent="brand" />
                <StatCard label="Success Rate" value={`${metrics.successRate}%`} delta={2.4} deltaLabel="vs last week" icon={CheckCircle} accent="success" />
                <StatCard label="Failure Rate" value={`${metrics.failureRate}%`} delta={-1.2} deltaLabel="vs last week" icon={XCircle} accent="danger" />
                <StatCard label="Avg Duration" value={fmtDur(metrics.avgDuration * 1000)} delta={-6} deltaLabel="vs last week" icon={Clock} accent="info" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="card p-5 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="section-title">Failure Rate Trend</h2>
                            <p className="muted text-xs mt-0.5">Last 14 days · all repositories · updates every minute</p>
                        </div>
                        <span className="badge-danger text-xs">Alert at 20%</span>
                    </div>
                    <FailureRateChart data={metrics.failureRateTrend} threshold={20} />
                </div>

                <div className="card p-5">
                    <h2 className="section-title mb-0.5">Run Breakdown</h2>
                    <p className="muted text-xs mb-3">All time · by status</p>
                    <SuccessRatioChart data={metrics.statusBreakdown} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card p-5">
                    <h2 className="section-title mb-0.5">Stage Duration Breakdown</h2>
                    <p className="muted text-xs mb-4">Avg vs max · seconds</p>
                    <StageDurationChart data={metrics.stageDurations} />
                </div>

                {/* Recent runs */}
                <div className="card p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="section-title">Recent Runs</h2>
                            <p className="muted text-xs mt-0.5">New runs appear automatically</p>
                        </div>
                        <Link to="/demo/runs" className="text-xs text-brand-500 hover:underline font-medium">
                            View all →
                        </Link>
                    </div>
                    <ul className="space-y-1.5 flex-1">
                        {runs.slice(0, 7).map(run => (
                            <li key={run.id} className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <Badge status={run.status.toLowerCase()} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                        {run.repoName}
                                        <span className="font-mono text-xs text-gray-400 ml-1">#{run.buildNumber}</span>
                                    </p>
                                    <p className="text-xs text-gray-400 truncate font-mono">{run.branch}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-xs font-mono text-gray-500">{fmtDur(run.durationMs)}</p>
                                    <p className="text-xs text-gray-400">
                                        {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* AI banner */}
            <div className="card p-4 border-brand-200 dark:border-brand-800/60 bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-brand-900/20 dark:to-indigo-900/20 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-brand-100 dark:bg-brand-800/60 flex-shrink-0">
                    <Zap size={18} className="text-brand-600 dark:text-brand-300" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">AI Insight</p>
                    <p className="text-sm text-brand-700 dark:text-brand-300 mt-0.5">
                        <strong>ml-pipeline</strong> has a recurring GPU OOM after a PyTorch upgrade.
                        AI has identified the root cause and 4 remediation steps.
                    </p>
                </div>
                <Link to="/demo/insights" className="btn-primary flex-shrink-0 text-xs whitespace-nowrap">
                    Full Analysis
                </Link>
            </div>
        </div>
    )
}