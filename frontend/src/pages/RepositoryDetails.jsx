// PATH: frontend/src/pages/RepositoryDetails.jsx

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

import {
    ArrowLeft,
    RefreshCw,
    GitBranch,
    Activity,
    Zap,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    ExternalLink,
    Sparkles,
} from 'lucide-react'

import {
    repoApi,
    runApi,
    aiApi,
} from '@/api/client'

import { usePolling } from '@/hooks/usePolling'

import { useToast } from '@/components/ui/Toast'

import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'

import {
    Spinner,
    FullPageSpinner,
} from '@/components/ui/Spinner'

import { ErrorBanner } from '@/components/ui'

import { FailureRateChart }
    from '@/components/charts/FailureRateChart'

import { StageDurationChart }
    from '@/components/charts/StageDurationChart'

import { SuccessRatioChart }
    from '@/components/charts/SuccessRatioChart'

import { RunsTable }
    from '@/components/runs/RunsTable'

import { InsightCard }
    from '@/components/ai/InsightCard'

import {
    formatDistanceToNow,
    format,
} from 'date-fns'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDuration(ms) {

    if (!ms || Number.isNaN(ms)) {

        return '—'
    }

    const seconds = Math.floor(ms / 1000)

    if (seconds < 60) {

        return `${seconds}s`
    }

    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

function HealthBar({ rate = 0 }) {

    const color =
        rate >= 85
            ? 'bg-emerald-500'
            : rate >= 60
                ? 'bg-amber-500'
                : 'bg-red-500'

    const textColor =
        rate >= 85
            ? 'text-emerald-600 dark:text-emerald-400'
            : rate >= 60
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'

    return (
        <div>
            <span className={`text-3xl font-bold ${textColor}`}>
                {rate}%
            </span>

            <div
                className="
          w-full h-2 mt-2 rounded-full
          bg-gray-100 dark:bg-gray-800
        "
            >
                <div
                    className={`
            ${color}
            h-2 rounded-full
            transition-all duration-700
          `}
                    style={{
                        width: `${rate}%`,
                    }}
                />
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
    'Overview',
    'Runs',
    'AI Insights',
    'Flaky Tests',
]

function TabBar({
    active,
    onChange,
}) {

    return (
        <div
            className="
        flex gap-1 border-b
        border-gray-200 dark:border-gray-800
      "
        >

            {TABS.map((tab) => (

                <button
                    key={tab}
                    onClick={() => onChange(tab)}
                    className={`
            px-4 py-2.5 text-sm font-medium
            transition-colors border-b-2 -mb-px

            ${active === tab
                            ? `
                border-brand-600
                text-brand-600
                dark:text-brand-400
              `
                            : `
                border-transparent
                text-gray-500
                hover:text-gray-700
                dark:hover:text-gray-300
              `
                        }
          `}
                >
                    {tab}
                </button>
            ))}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview Tab
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab({
    metrics,
    repository,
}) {

    if (!metrics) {

        return (
            <div
                className="
          flex items-center justify-center
          py-20
        "
            >
                <Spinner size="lg" />
            </div>
        )
    }

    return (
        <div className="space-y-5">

            {/* KPI Cards */}

            <div
                className="
          grid grid-cols-2 lg:grid-cols-4
          gap-4
        "
            >

                <StatCard
                    label="Total Runs"
                    value={
                        metrics.totalRuns?.toLocaleString()
                        ?? '—'
                    }
                    icon={Activity}
                    accent="brand"
                />

                <StatCard
                    label="Success Rate"
                    value={`${metrics.successRate ?? 0}%`}
                    icon={CheckCircle}
                    accent="success"
                />

                <StatCard
                    label="Failure Rate"
                    value={`${metrics.failureRate ?? 0}%`}
                    icon={XCircle}
                    accent="danger"
                />

                <StatCard
                    label="Avg Duration"
                    value={formatDuration(
                        (metrics.avgDuration ?? 0) * 1000
                    )}
                    icon={Clock}
                    accent="info"
                />
            </div>

            {/* Charts */}

            <div
                className="
          grid grid-cols-1 lg:grid-cols-3
          gap-4
        "
            >

                <div className="card p-5 lg:col-span-2">

                    <div
                        className="
              flex items-center justify-between
              mb-4
            "
                    >

                        <div>

                            <h3 className="section-title">
                                Failure Rate Trend
                            </h3>

                            <p className="muted text-xs mt-0.5">
                                Last 14 days
                            </p>
                        </div>

                        <span className="badge-danger text-xs">
                            Alert at 20%
                        </span>
                    </div>

                    {metrics.failureRateTrend?.length > 0 ? (

                        <FailureRateChart
                            data={metrics.failureRateTrend}
                            threshold={20}
                        />

                    ) : (

                        <p className="muted text-center py-16">
                            Not enough data yet
                        </p>
                    )}
                </div>

                <div className="card p-5">

                    <h3 className="section-title mb-0.5">
                        Run Breakdown
                    </h3>

                    <p className="muted text-xs mb-3">
                        By status
                    </p>

                    <SuccessRatioChart
                        data={metrics.statusBreakdown ?? []}
                    />
                </div>
            </div>

            {/* Stage Durations */}

            {metrics.stageDurations?.length > 0 && (

                <div className="card p-5">

                    <h3 className="section-title mb-0.5">
                        Stage Duration Breakdown
                    </h3>

                    <p className="muted text-xs mb-4">
                        Avg vs max · seconds
                    </p>

                    <StageDurationChart
                        data={metrics.stageDurations}
                    />
                </div>
            )}

            {/* Repository Info */}

            <div className="card p-5">

                <h3 className="section-title mb-4">
                    Repository Info
                </h3>

                <div
                    className="
            grid grid-cols-2 md:grid-cols-3
            gap-3 text-sm
          "
                >

                    {[
                        [
                            'Default branch',
                            repository?.defaultBranch ?? 'main',
                        ],

                        [
                            'Last synced',
                            repository?.lastSyncedAt
                                ? formatDistanceToNow(
                                    new Date(repository.lastSyncedAt),
                                    { addSuffix: true }
                                )
                                : '—',
                        ],

                        [
                            'Added',
                            repository?.createdAt
                                ? format(
                                    new Date(repository.createdAt),
                                    'MMM d, yyyy'
                                )
                                : '—',
                        ],

                        [
                            'Source',
                            repository?.source ?? 'GitHub',
                        ],

                        [
                            'Flaky tests',
                            metrics.flakyTestCount ?? 0,
                        ],

                        [
                            'Window',
                            `${metrics.windowDays ?? 14} days`,
                        ],
                    ].map(([key, value]) => (

                        <div
                            key={key}
                            className="
                bg-gray-50 dark:bg-gray-800/60
                rounded-xl p-3
              "
                        >

                            <p className="text-xs text-gray-400 mb-0.5">
                                {key}
                            </p>

                            <p
                                className="
                  font-semibold
                  text-gray-900 dark:text-gray-100
                "
                            >
                                {value}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function RepositoryDetails() {

    const { id } = useParams()

    const repositoryId = Number(id)

    const navigate = useNavigate()

    const { toast } = useToast()

    const [repository, setRepository] =
        useState(null)

    const [metrics, setMetrics] =
        useState(null)

    const [analyses, setAnalyses] =
        useState([])

    const [loading, setLoading] =
        useState(true)

    const [loadingAnalyses, setLoadingAnalyses] =
        useState(false)

    const [error, setError] =
        useState(null)

    const [syncing, setSyncing] =
        useState(false)

    const [activeTab, setActiveTab] =
        useState('Overview')

    // ───────────────────────────────────────────────────────────────────────────
    // Fetch Core Data
    // ───────────────────────────────────────────────────────────────────────────

    const fetchCoreData = useCallback(async () => {

        try {

            const [
                repositoryResponse,
                metricsResponse,
            ] = await Promise.all([
                repoApi.get(repositoryId),
                repoApi.metrics(repositoryId),
            ])

            setRepository(
                repositoryResponse.data.data
            )

            setMetrics(
                metricsResponse.data.data
            )

            setError(null)

        } catch (error) {

            setError(
                error.response?.data?.message
                ??
                'Failed to load repository.'
            )

        } finally {

            setLoading(false)
        }

    }, [repositoryId])

    // ───────────────────────────────────────────────────────────────────────────
    // Fetch Analyses
    // ───────────────────────────────────────────────────────────────────────────

    const fetchAnalyses = useCallback(async () => {

        setLoadingAnalyses(true)

        try {

            const response =
                await repoApi.analyses(repositoryId)

            setAnalyses(
                response.data.data ?? []
            )

        } catch (error) {

            console.error(
                'Failed to fetch analyses',
                error
            )

        } finally {

            setLoadingAnalyses(false)
        }

    }, [repositoryId])

    // ───────────────────────────────────────────────────────────────────────────
    // Initial Load
    // ───────────────────────────────────────────────────────────────────────────

    useEffect(() => {

        fetchCoreData()

        fetchAnalyses()

    }, [
        fetchCoreData,
        fetchAnalyses,
    ])

    // ───────────────────────────────────────────────────────────────────────────
    // Polling
    // ───────────────────────────────────────────────────────────────────────────

    usePolling(
        fetchCoreData,
        30000
    )

    // ───────────────────────────────────────────────────────────────────────────
    // Sync
    // ───────────────────────────────────────────────────────────────────────────

    const handleSync = async () => {

        setSyncing(true)

        try {

            await repoApi.sync(repositoryId)

            await fetchCoreData()

            toast.success(
                'Repository synced successfully'
            )

        } catch (error) {

            toast.error(
                'Sync failed',
                error.response?.data?.message
                ??
                'Could not sync repository.'
            )

        } finally {

            setSyncing(false)
        }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Loading
    // ───────────────────────────────────────────────────────────────────────────

    if (loading) {

        return <FullPageSpinner />
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Render
    // ───────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-5 animate-fade-in">

            {/* Header */}

            <div
                className="
          flex items-start justify-between
          flex-wrap gap-4
        "
            >

                <div className="flex items-center gap-3">

                    <button
                        onClick={() => navigate('/pipelines')}
                        className="btn-ghost p-1.5 rounded-lg"
                    >
                        <ArrowLeft size={17} />
                    </button>

                    <div
                        className="
              w-10 h-10 rounded-xl
              bg-gray-100 dark:bg-gray-800
              flex items-center justify-center
            "
                    >

                        <GitBranch
                            size={18}
                            className="text-brand-500"
                        />
                    </div>

                    <div>

                        <div className="flex items-center gap-2 flex-wrap">

                            <h1
                                className="
                  text-lg font-bold
                  text-gray-900 dark:text-gray-100
                "
                            >
                                {repository?.owner}
                                /
                                {repository?.repoName}
                            </h1>

                            {repository && (

                                <Badge
                                    status={
                                        (
                                            repository.lastRunStatus
                                            ??
                                            'pending'
                                        ).toLowerCase()
                                    }
                                />
                            )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">

                            <span
                                className="
                  font-mono text-xs text-gray-400
                "
                            >
                                {repository?.defaultBranch ?? 'main'}
                            </span>

                            {repository?.owner && (

                                <a
                                    href={`https://github.com/${repository.owner}/${repository.repoName}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="
                    text-xs text-brand-500
                    hover:underline
                    flex items-center gap-0.5
                  "
                                >

                                    GitHub

                                    <ExternalLink size={10} />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}

                <div className="flex items-center gap-2">

                    <Link
                        to="/insights"
                        className="btn-secondary btn-sm"
                    >

                        <Sparkles size={13} />

                        AI Insights
                    </Link>

                    <button
                        className="btn-primary btn-sm"
                        onClick={handleSync}
                        disabled={syncing}
                    >

                        <RefreshCw
                            size={13}
                            className={
                                syncing
                                    ? 'animate-spin'
                                    : ''
                            }
                        />

                        {syncing
                            ? 'Syncing…'
                            : 'Sync Now'}
                    </button>
                </div>
            </div>

            {/* Error */}

            {error && (

                <ErrorBanner
                    message={error}
                    onRetry={fetchCoreData}
                />
            )}

            {/* Health Summary */}

            {metrics && (

                <div
                    className="
            card p-5
            flex items-center gap-6
            flex-wrap
          "
                >

                    <div className="min-w-[140px]">

                        <p className="text-xs text-gray-400 mb-1">
                            Success rate (14 days)
                        </p>

                        <HealthBar
                            rate={metrics.successRate ?? 0}
                        />
                    </div>

                    <div
                        className="
              flex-1 grid grid-cols-2 sm:grid-cols-4
              gap-4
            "
                    >

                        {[
                            {
                                label: 'Total runs',
                                value:
                                    metrics.totalRuns?.toLocaleString()
                                    ?? '—',
                            },

                            {
                                label: 'Failed',
                                value:
                                    metrics.failedRuns?.toLocaleString()
                                    ?? '—',
                            },

                            {
                                label: 'Avg duration',
                                value: formatDuration(
                                    (metrics.avgDuration ?? 0) * 1000
                                ),
                            },

                            {
                                label: 'Flaky tests',
                                value:
                                    metrics.flakyTestCount ?? 0,
                            },
                        ].map(({ label, value }) => (

                            <div key={label}>

                                <p className="text-xs text-gray-400">
                                    {label}
                                </p>

                                <p
                                    className="
                    text-lg font-bold
                    text-gray-900 dark:text-gray-100
                    mt-0.5
                  "
                                >
                                    {value}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs */}

            <TabBar
                active={activeTab}
                onChange={setActiveTab}
            />

            {/* Tab Content */}

            <div className="animate-fade-in">

                {activeTab === 'Overview' && (

                    <OverviewTab
                        metrics={metrics}
                        repository={repository}
                    />
                )}

                {activeTab === 'Runs' && (

                    <RunsTable
                        repositoryId={repositoryId}
                    />
                )}

                {activeTab === 'AI Insights' && (

                    <div className="space-y-4">

                        {loadingAnalyses ? (

                            <div className="flex justify-center py-20">
                                <Spinner size="lg" />
                            </div>

                        ) : analyses.length === 0 ? (

                            <div className="card p-12 text-center">

                                <Sparkles
                                    size={36}
                                    className="
                    text-gray-300 dark:text-gray-700
                    mx-auto mb-3
                  "
                                />

                                <p
                                    className="
                    font-medium
                    text-gray-700 dark:text-gray-300
                  "
                                >
                                    No analyses yet
                                </p>
                            </div>

                        ) : (

                            analyses.map((analysis, index) => (

                                <InsightCard
                                    key={analysis.id ?? index}
                                    insight={analysis}
                                />
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'Flaky Tests' && (

                    <div className="space-y-3">

                        {analyses
                            .filter((analysis) => analysis.isFlaky)
                            .map((analysis) => (

                                <div
                                    key={analysis.id}
                                    className="card p-4"
                                >

                                    <div className="flex items-center gap-2">

                                        <AlertTriangle
                                            size={16}
                                            className="text-amber-500"
                                        />

                                        <span className="font-medium">
                                            {analysis.summary}
                                        </span>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>
        </div>
    )
}