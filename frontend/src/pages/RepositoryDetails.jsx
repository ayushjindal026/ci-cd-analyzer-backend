import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link }     from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, GitBranch, Activity,
  Zap, TrendingUp, CheckCircle, XCircle,
  Clock, AlertTriangle, ExternalLink, Sparkles,
} from 'lucide-react'
import { repoApi, runApi, aiApi }       from '@/api/client'
import { usePolling }                   from '@/hooks/usePolling'
import { useToast }                     from '@/components/ui/Toast'
import { StatCard }                     from '@/components/ui/StatCard'
import { Badge }                        from '@/components/ui/Badge'
import { Spinner, FullPageSpinner }     from '@/components/ui/Spinner'
import { ErrorBanner }                  from '@/components/ui'
import { FailureRateChart }             from '@/components/charts/FailureRateChart'
import { StageDurationChart }           from '@/components/charts/StageDurationChart'
import { SuccessRatioChart }            from '@/components/charts/SuccessRatioChart'
import { RunsTable }                    from '@/components/runs/RunsTable'
import { InsightCard }                  from '@/components/ai/InsightCard'
import { RunDetailDrawer }              from '@/components/runs/RunDetailDrawer'
import { formatDistanceToNow, format }  from 'date-fns'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDur(ms) {
  if (!ms) return '—'
  const s = Math.floor(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

function HealthBar({ rate = 0 }) {
  const color = rate >= 85 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-red-500'
  const text  = rate >= 85 ? 'text-emerald-600 dark:text-emerald-400'
              : rate >= 60 ? 'text-amber-600 dark:text-amber-400'
              :               'text-red-600 dark:text-red-400'
  return (
    <div>
      <span className={`text-3xl font-bold ${text}`}>{rate}%</span>
      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mt-2">
        <div className={`${color} h-2 rounded-full transition-all duration-700`}
             style={{ width: `${rate}%` }} />
      </div>
    </div>
  )
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
const TABS = ['Overview', 'Runs', 'AI Insights', 'Flaky Tests']

function TabBar({ active, onChange }) {
  return (
    <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
      {TABS.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px
            ${active === tab
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ metrics, repo }) {
  if (!metrics) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Runs"   value={metrics.totalRuns?.toLocaleString() ?? '—'} icon={Activity}    accent="brand"   />
        <StatCard label="Success Rate" value={`${metrics.successRate ?? 0}%`}             icon={CheckCircle} accent="success" />
        <StatCard label="Failure Rate" value={`${metrics.failureRate ?? 0}%`}             icon={XCircle}     accent="danger"  />
        <StatCard label="Avg Duration" value={fmtDur(metrics.avgDuration * 1000)}          icon={Clock}       accent="info"    />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-title">Failure Rate Trend</h3>
              <p className="muted text-xs mt-0.5">Last 14 days</p>
            </div>
            <span className="badge-danger text-xs">Alert at 20%</span>
          </div>
          {metrics.failureRateTrend?.length > 0
            ? <FailureRateChart data={metrics.failureRateTrend} threshold={20} />
            : <p className="muted text-center py-16">Not enough data yet</p>}
        </div>

        <div className="card p-5">
          <h3 className="section-title mb-0.5">Run Breakdown</h3>
          <p className="muted text-xs mb-3">By status</p>
          <SuccessRatioChart data={metrics.statusBreakdown ?? []} />
        </div>
      </div>

      {/* Stage durations */}
      {metrics.stageDurations?.length > 0 && (
        <div className="card p-5">
          <h3 className="section-title mb-0.5">Stage Duration Breakdown</h3>
          <p className="muted text-xs mb-4">Avg vs max · seconds</p>
          <StageDurationChart data={metrics.stageDurations} />
        </div>
      )}

      {/* Repo meta */}
      <div className="card p-5">
        <h3 className="section-title mb-4">Repository Info</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {[
            ['Default branch', repo?.defaultBranch ?? 'main'],
            ['Last synced',    repo?.lastSyncedAt ? formatDistanceToNow(new Date(repo.lastSyncedAt), { addSuffix: true }) : '—'],
            ['Added',          repo?.createdAt    ? format(new Date(repo.createdAt), 'MMM d, yyyy') : '—'],
            ['Source',         repo?.source ?? 'GitHub'],
            ['Flaky tests',    metrics.flakyTestCount ?? 0],
            ['Window',         `${metrics.windowDays ?? 14} days`],
          ].map(([k, v]) => (
            <div key={k} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">{k}</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── AI Insights tab ───────────────────────────────────────────────────────────
function AiInsightsTab({ repoId, analyses, loadingA }) {
  const { toast }                   = useToast()
  const [triggering, setTriggering] = useState(false)

  const handleTriggerLatest = async () => {
    setTriggering(true)
    try {
      // Fetch latest failed run and trigger analysis
      const res  = await runApi.repoRuns(repoId, { size: 10 })
      const runs = Array.isArray(res.data) ? res.data : res.data?.content ?? []
      const fail = runs.find(r => ['FAILED','failed'].includes(r.status))
      if (!fail) { toast.info('No failed runs', 'Nothing to analyse right now.'); return }
      await aiApi.trigger(repoId, fail.id)
      toast.success('AI analysis queued', 'Results will appear here in ~30 seconds.')
    } catch (e) {
      toast.error('Failed', e.response?.data?.message ?? 'Could not trigger analysis.')
    } finally { setTriggering(false) }
  }

  if (loadingA) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="muted">AI-generated diagnoses from failed pipeline runs.</p>
        <button className="btn-primary btn-sm" onClick={handleTriggerLatest} disabled={triggering}>
          {triggering ? <><Spinner size="sm" /> Queuing…</> : <><Zap size={13} /> Analyse Latest Failure</>}
        </button>
      </div>

      {analyses.length === 0 && (
        <div className="card p-12 text-center">
          <Sparkles size={36} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="font-medium text-gray-700 dark:text-gray-300">No analyses yet</p>
          <p className="muted text-xs mt-1">Click "Analyse Latest Failure" to generate the first AI diagnosis.</p>
        </div>
      )}

      {analyses.map((a, i) => (
        <InsightCard key={a.id ?? i} insight={{
          severity:         (a.severity ?? 'info').toLowerCase(),
          stage:            a.stage,
          title:            a.summary ?? `Run #${a.runId} analysis`,
          summary:          a.rootCause,
          detail:           a.diagnosis,
          recommendation:   a.recommendation,
          remediationSteps: a.remediationSteps
            ? a.remediationSteps.split('\n').filter(Boolean)
            : [],
          isFlaky:          a.isFlaky,
          flakinessScore:   a.flakinessScore,
          estimatedFixTime: a.estimatedFixTime,
          priority:         a.priority,
          modelUsed:        a.modelUsed,
          analysedAt:       a.analysedAt,
        }} />
      ))}
    </div>
  )
}

// ── Flaky Tests tab ───────────────────────────────────────────────────────────
function FlakyTestsTab({ flakyAnalyses }) {
  if (flakyAnalyses.length === 0) {
    return (
      <div className="card p-12 text-center">
        <CheckCircle size={36} className="text-emerald-400 mx-auto mb-3" />
        <p className="font-medium text-gray-700 dark:text-gray-300">No flaky tests detected</p>
        <p className="muted text-xs mt-1">
          AI analysis will flag flaky tests automatically when failure patterns are detected.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="card p-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20
                      flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700 dark:text-amber-300">
          <strong>{flakyAnalyses.length}</strong> run{flakyAnalyses.length !== 1 ? 's' : ''} identified as
          flaky — failures caused by non-deterministic behaviour, not actual bugs.
        </p>
      </div>

      {flakyAnalyses.map((a, i) => (
        <div key={a.id ?? i} className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="badge-warning">Flaky</span>
              <span className="font-mono text-xs text-gray-400">Run #{a.runId}</span>
              {a.priority && <span className="badge-neutral text-xs">{a.priority}</span>}
            </div>
            <span className="text-xs text-gray-400">
              Score: {Math.round((a.flakinessScore ?? 0) * 100)}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {a.summary ?? 'Flaky test detected'}
          </p>
          {a.failingTests && (
            <div className="flex flex-wrap gap-1.5">
              {a.failingTests.split('|').filter(Boolean).map(t => (
                <code key={t} className="font-mono text-xs bg-gray-100 dark:bg-gray-800
                                          text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                  {t}
                </code>
              ))}
            </div>
          )}
          {a.recommendation && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              💡 {a.recommendation}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main page
// ═════════════════════════════════════════════════════════════════════════════
export default function RepositoryDetails() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { toast }    = useToast()
  const repoId       = Number(id)

  const [repo,     setRepo]     = useState(null)
  const [metrics,  setMetrics]  = useState(null)
  const [analyses, setAnalyses] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [loadingA, setLoadingA] = useState(false)
  const [error,    setError]    = useState(null)
  const [syncing,  setSyncing]  = useState(false)
  const [tab,      setTab]      = useState('Overview')

  // ── Fetch repo + metrics ──────────────────────────────────────────────────
  const fetchCore = useCallback(async () => {
    try {
      const [repoRes, metricsRes] = await Promise.all([
        repoApi.get(repoId),
        repoApi.metrics(repoId),
      ])
      setRepo(repoRes.data)
      setMetrics(metricsRes.data)
      setError(null)
    } catch (e) {
      setError(e.response?.data?.message ?? 'Failed to load repository data.')
    } finally {
      setLoading(false)
    }
  }, [repoId])

  // ── Fetch AI analyses ─────────────────────────────────────────────────────
  const fetchAnalyses = useCallback(async () => {
    setLoadingA(true)
    try {
      const res = await repoApi.get(repoId)  // uses /analyses sub-route
      // Try dedicated analyses endpoint
      const aRes = await fetch(`/api/v1/repositories/${repoId}/analyses`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('piq_access_token')}` },
      })
      if (aRes.ok) setAnalyses(await aRes.json())
    } catch { /* analyses are optional enrichment */ }
    finally { setLoadingA(false) }
  }, [repoId])

  useEffect(() => {
    fetchCore()
    fetchAnalyses()
  }, [fetchCore, fetchAnalyses])

  // Poll metrics every 30s (60s if no live runs)
  usePolling(fetchCore, 30_000)

  // ── Sync ──────────────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true)
    try {
      await repoApi.sync(repoId)
      await fetchCore()
      toast.success('Synced', `${repo?.owner}/${repo?.repoName} synced successfully.`)
    } catch (e) {
      toast.error('Sync failed', e.response?.data?.message ?? 'Could not sync repository.')
    } finally { setSyncing(false) }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const flakyAnalyses = analyses.filter(a => a.isFlaky)

  if (loading) return <FullPageSpinner />

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/repos')}
            className="btn-ghost p-1.5 rounded-lg"
            title="Back to repositories"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800
                          flex items-center justify-center flex-shrink-0">
            <GitBranch size={18} className="text-brand-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {repo?.owner}/{repo?.repoName}
              </h1>
              {repo && <Badge status={(repo.lastRunStatus ?? 'pending').toLowerCase()} />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-xs text-gray-400">{repo?.defaultBranch ?? 'main'}</span>
              {repo?.owner && (
                <a
                  href={`https://github.com/${repo.owner}/${repo.repoName}`}
                  target="_blank" rel="noreferrer"
                  className="text-xs text-brand-500 hover:underline flex items-center gap-0.5"
                >
                  GitHub <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link to="/insights" className="btn-secondary btn-sm">
            <Sparkles size={13} /> AI Insights
          </Link>
          <button
            className="btn-primary btn-sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchCore} />}

      {/* Quick health bar */}
      {metrics && (
        <div className="card p-5 flex items-center gap-6 flex-wrap">
          <div className="min-w-[140px]">
            <p className="text-xs text-gray-400 mb-1">Success rate (14 days)</p>
            <HealthBar rate={metrics.successRate ?? 0} />
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total runs',   value: metrics.totalRuns?.toLocaleString() ?? '—'       },
              { label: 'Failed',       value: metrics.failedRuns?.toLocaleString() ?? '—'      },
              { label: 'Avg duration', value: fmtDur(metrics.avgDuration * 1000)               },
              { label: 'Flaky tests',  value: metrics.flakyTestCount ?? 0                      },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <TabBar active={tab} onChange={setTab} />

      {/* Tab content */}
      <div className="animate-fade-in">
        {tab === 'Overview'    && <OverviewTab metrics={metrics} repo={repo} />}
        {tab === 'Runs'        && <RunsTable repoId={repoId} />}
        {tab === 'AI Insights' && <AiInsightsTab repoId={repoId} analyses={analyses} loadingA={loadingA} />}
        {tab === 'Flaky Tests' && <FlakyTestsTab flakyAnalyses={flakyAnalyses} />}
      </div>
    </div>
  )
}