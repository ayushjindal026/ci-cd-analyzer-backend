// ═══════════════════════════════════════════════════════════════════════════════
// src/pages/Pipelines.jsx  — FINAL (Repositories page)
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import {
    GitBranch, Plus, RefreshCw, Trash2,
    ExternalLink, AlertCircle, ArrowUpRight, Activity
} from 'lucide-react'
import { useRepositories } from '@/hooks/useRepositories'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorBanner } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { Link } from 'react-router-dom'

/* ── Health bar ───────────────────────────────────────────────────────────── */
function HealthBar({ rate = 0 }) {
    const color = rate >= 85 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-red-500'
    const text = rate >= 85 ? 'text-emerald-600 dark:text-emerald-400'
        : rate >= 60 ? 'text-amber-600 dark:text-amber-400'
            : 'text-red-600 dark:text-red-400'
    return (
        <div>
            <p className={`text-sm font-semibold mb-1 ${text}`}>{rate}%</p>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                <div
                    className={`${color} h-1.5 rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(100, rate)}%` }}
                />
            </div>
        </div>
    )
}

/* ── Language badge colors ────────────────────────────────────────────────── */
const LANG_COLORS = {
    Java: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
    JavaScript: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
    TypeScript: 'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-400',
    Python: 'bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-400',
    Dockerfile: 'bg-sky-100    text-sky-700    dark:bg-sky-900/40    dark:text-sky-400',
    Go: 'bg-cyan-100   text-cyan-700   dark:bg-cyan-900/40   dark:text-cyan-400',
}

const MOCK_REPOS = [
    { id: 1, fullName: 'ayush/cicd-analyzer', language: 'Java', successRate: 78, totalRuns: 142, lastRunStatus: 'success', lastRunAt: new Date(Date.now() - 12 * 60000).toISOString() },
    { id: 2, fullName: 'ayush/spring-api', language: 'Java', successRate: 91, totalRuns: 58, lastRunStatus: 'running', lastRunAt: new Date(Date.now() - 3 * 60000).toISOString() },
    { id: 3, fullName: 'ayush/docker-compose', language: 'Dockerfile', successRate: 55, totalRuns: 23, lastRunStatus: 'failed', lastRunAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: 4, fullName: 'ayush/react-dashboard', language: 'JavaScript', successRate: 96, totalRuns: 89, lastRunStatus: 'success', lastRunAt: new Date(Date.now() - 45 * 60000).toISOString() },
]

export default function Pipelines() {
    const { repos, loading, error, refetch, addRepo, removeRepo, syncRepo } = useRepositories()
    const [showAdd, setShowAdd] = useState(false)
    const [repoUrl, setRepoUrl] = useState('')
    const [adding, setAdding] = useState(false)
    const [addErr, setAddErr] = useState(null)
    const [syncing, setSyncing] = useState(null)
    const [deleting, setDeleting] = useState(null)
    const [confirm, setConfirm] = useState(null)  // repo id to confirm delete

    const display = repos.length ? repos : MOCK_REPOS

    const handleAdd = async () => {
        if (!repoUrl.trim()) return
        setAdding(true); setAddErr(null)
        try {
            await addRepo({ repoUrl: repoUrl.trim() })
            setShowAdd(false); setRepoUrl('')
        } catch (e) {
            setAddErr(e.response?.data?.message ?? 'Failed to add repository. Check the URL and try again.')
        } finally { setAdding(false) }
    }

    const handleSync = async id => {
        setSyncing(id)
        try { await syncRepo(id) } catch { /* toast later */ } finally { setSyncing(null) }
    }

    const handleDelete = async id => {
        setDeleting(id); setConfirm(null)
        try { await removeRepo(id) } finally { setDeleting(null) }
    }

    return (
        <div className="space-y-5 animate-fade-in">

            {/* Header actions */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="muted">Connect and monitor your GitHub repositories.</p>
                <div className="flex items-center gap-2">
                    <button className="btn-secondary btn-sm" onClick={refetch} disabled={loading}>
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button className="btn-primary" onClick={() => setShowAdd(true)}>
                        <Plus size={15} /> Add Repository
                    </button>
                </div>
            </div>

            {error && <ErrorBanner message={error} onRetry={refetch} />}

            {/* Summary stats */}
            {display.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Connected repos', value: display.length },
                        { label: 'Total runs', value: display.reduce((s, r) => s + (r.totalRuns ?? 0), 0) },
                        { label: 'Avg success rate', value: `${Math.round(display.reduce((s, r) => s + (r.successRate ?? 0), 0) / display.length)}%` },
                        { label: 'Active pipelines', value: display.filter(r => (r.lastRunStatus ?? '').toLowerCase() === 'running').length },
                    ].map(({ label, value }) => (
                        <div key={label} className="card p-4">
                            <p className="text-xs text-gray-400">{label}</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Table */}
            {loading
                ? <div className="flex justify-center py-24"><Spinner size="lg" /></div>
                : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Repository</th>
                                    <th>Language</th>
                                    <th>Health</th>
                                    <th>Total Runs</th>
                                    <th>Last Run</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {display.length === 0 && (
                                    <tr>
                                        <td colSpan={7}>
                                            <EmptyState
                                                icon={GitBranch}
                                                title="No repositories connected"
                                                description="Add a GitHub repository to start analyzing your CI/CD pipelines."
                                                action={
                                                    <button className="btn-primary" onClick={() => setShowAdd(true)}>
                                                        <Plus size={14} /> Add Repository
                                                    </button>
                                                }
                                            />
                                        </td>
                                    </tr>
                                )}
                                {display.map(repo => (
                                    <tr key={repo.id}>
                                        <td>
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                                    <GitBranch size={14} className="text-brand-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                                        {repo.fullName ?? repo.name}
                                                    </p>
                                                    <a
                                                        href={`https://github.com/${repo.fullName ?? repo.name}`}
                                                        target="_blank" rel="noreferrer"
                                                        className="text-xs text-brand-500 hover:underline flex items-center gap-0.5"
                                                    >
                                                        View on GitHub <ArrowUpRight size={10} />
                                                    </a>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge text-xs ${LANG_COLORS[repo.language] ?? 'badge-neutral'}`}>
                                                {repo.language ?? '—'}
                                            </span>
                                        </td>
                                        <td className="min-w-[140px]">
                                            <HealthBar rate={repo.successRate ?? 0} />
                                        </td>
                                        <td>
                                            <span className="font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                {(repo.totalRuns ?? 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="text-xs text-gray-400 whitespace-nowrap">
                                            {repo.lastRunAt
                                                ? new Date(repo.lastRunAt).toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })
                                                : '—'}
                                        </td>
                                        <td>
                                            <Badge status={(repo.lastRunStatus ?? 'pending').toLowerCase()} />
                                        </td>
                                        <td>
                                            <div className="flex items-center justify-end gap-1">
                                                {/* Runs link */}
                                                <Link
                                                    to="/runs"
                                                    className="btn-ghost p-1.5 rounded-md"
                                                    title="View runs"
                                                >
                                                    <Activity size={14} />
                                                </Link>
                                                {/* Sync */}
                                                <button
                                                    className="btn-ghost p-1.5 rounded-md"
                                                    title="Sync repository"
                                                    onClick={() => handleSync(repo.id)}
                                                    disabled={syncing === repo.id}
                                                >
                                                    <RefreshCw size={14} className={syncing === repo.id ? 'animate-spin' : ''} />
                                                </button>
                                                {/* Delete */}
                                                {confirm === repo.id ? (
                                                    <div className="flex items-center gap-1 animate-fade-in">
                                                        <button
                                                            className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
                                                            onClick={() => handleDelete(repo.id)}
                                                            disabled={deleting === repo.id}
                                                        >
                                                            {deleting === repo.id ? 'Removing…' : 'Confirm'}
                                                        </button>
                                                        <button
                                                            className="text-xs text-gray-400 hover:underline"
                                                            onClick={() => setConfirm(null)}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        className="btn-ghost p-1.5 rounded-md hover:text-red-500 dark:hover:text-red-400"
                                                        title="Remove repository"
                                                        onClick={() => setConfirm(repo.id)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

            {/* Add Repo Modal */}
            <Modal
                open={showAdd}
                onClose={() => { setShowAdd(false); setRepoUrl(''); setAddErr(null) }}
                title="Add GitHub Repository"
                footer={
                    <>
                        <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                        <button
                            className="btn-primary"
                            onClick={handleAdd}
                            disabled={adding || !repoUrl.trim()}
                        >
                            {adding ? <><Spinner size="sm" /> Adding…</> : <><Plus size={14} /> Add</>}
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    {addErr && <ErrorBanner message={addErr} />}

                    <div>
                        <label className="label">GitHub repository</label>
                        <input
                            className="input"
                            placeholder="owner/repo  or  https://github.com/owner/repo"
                            value={repoUrl}
                            onChange={e => setRepoUrl(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            autoFocus
                        />
                    </div>

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
                        <AlertCircle size={14} className="text-brand-500 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-brand-700 dark:text-brand-300 space-y-1">
                            <p className="font-medium">Access requirements</p>
                            <p>Public repos work immediately. For private repos, your GitHub OAuth token must have <code className="mono bg-brand-100 dark:bg-brand-800 px-1 rounded">repo</code> scope.</p>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    )
}