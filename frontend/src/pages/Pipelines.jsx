import { useState } from 'react'
import { GitBranch, Plus, RefreshCw, Trash2, ExternalLink, AlertCircle } from 'lucide-react'
import { useRepositories } from '@/hooks/useRepositories'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorBanner } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'

function healthColor(rate) {
    if (rate >= 85) return 'text-emerald-600 dark:text-emerald-400'
    if (rate >= 60) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
}

function HealthBar({ rate }) {
    const color = rate >= 85 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-red-500'
    return (
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mt-1">
            <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${rate}%` }} />
        </div>
    )
}

const MOCK_REPOS = [
    { id: 1, fullName: 'ayush/cicd-analyzer', language: 'Java', successRate: 78, totalRuns: 142, lastRunStatus: 'success', lastRunAt: '2025-05-08T14:32:00Z' },
    { id: 2, fullName: 'ayush/spring-api', language: 'Java', successRate: 91, totalRuns: 58, lastRunStatus: 'running', lastRunAt: '2025-05-08T17:01:00Z' },
    { id: 3, fullName: 'ayush/docker-compose', language: 'Dockerfile', successRate: 55, totalRuns: 23, lastRunStatus: 'failed', lastRunAt: '2025-05-07T09:14:00Z' },
    { id: 4, fullName: 'ayush/react-dashboard', language: 'JavaScript', successRate: 96, totalRuns: 89, lastRunStatus: 'success', lastRunAt: '2025-05-08T16:45:00Z' },
]

export default function Pipelines() {
    const { repos, loading, error, refetch, addRepo, removeRepo, syncRepo } = useRepositories()
    const [showAdd, setShowAdd] = useState(false)
    const [repoUrl, setRepoUrl] = useState('')
    const [adding, setAdding] = useState(false)
    const [addError, setAddError] = useState(null)
    const [syncing, setSyncing] = useState(null)

    const displayRepos = repos.length ? repos : MOCK_REPOS

    const handleAdd = async () => {
        if (!repoUrl.trim()) return
        setAdding(true); setAddError(null)
        try {
            await addRepo({ repoUrl: repoUrl.trim() })
            setShowAdd(false); setRepoUrl('')
        } catch (e) {
            setAddError(e.response?.data?.message ?? 'Failed to add repository')
        } finally {
            setAdding(false)
        }
    }

    const handleSync = async id => {
        setSyncing(id)
        try { await syncRepo(id) } finally { setSyncing(null) }
    }

    return (
        <div className="space-y-5 animate-fade-in">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="muted">Manage and monitor your connected GitHub repositories.</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary" onClick={refetch} disabled={loading}>
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button className="btn-primary" onClick={() => setShowAdd(true)}>
                        <Plus size={15} /> Add Repository
                    </button>
                </div>
            </div>

            {error && <ErrorBanner message={error} onRetry={refetch} />}

            {/* Table */}
            {loading
                ? <div className="flex justify-center py-20"><Spinner size="lg" /></div>
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
                                {displayRepos.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center">
                                            <EmptyState
                                                icon={GitBranch}
                                                title="No repositories yet"
                                                description="Add a GitHub repository to start analyzing your CI/CD pipelines."
                                                action={<button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} />Add Repository</button>}
                                            />
                                        </td>
                                    </tr>
                                )}
                                {displayRepos.map(repo => (
                                    <tr key={repo.id}>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <GitBranch size={15} className="text-brand-500 flex-shrink-0" />
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-gray-100">{repo.fullName}</p>
                                                    <a
                                                        href={`https://github.com/${repo.fullName}`}
                                                        target="_blank" rel="noreferrer"
                                                        className="text-xs text-brand-500 hover:underline flex items-center gap-0.5"
                                                    >
                                                        github.com/{repo.fullName} <ExternalLink size={10} />
                                                    </a>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge-neutral">{repo.language ?? '—'}</span>
                                        </td>
                                        <td className="min-w-[120px]">
                                            <p className={`text-sm font-semibold ${healthColor(repo.successRate ?? 0)}`}>
                                                {repo.successRate ?? 0}%
                                            </p>
                                            <HealthBar rate={repo.successRate ?? 0} />
                                        </td>
                                        <td className="font-mono text-sm">{repo.totalRuns ?? 0}</td>
                                        <td className="text-xs text-gray-400">
                                            {repo.lastRunAt
                                                ? new Date(repo.lastRunAt).toLocaleString()
                                                : '—'}
                                        </td>
                                        <td><Badge status={repo.lastRunStatus ?? 'pending'} /></td>
                                        <td>
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    className="btn-ghost p-1.5"
                                                    title="Sync"
                                                    onClick={() => handleSync(repo.id)}
                                                    disabled={syncing === repo.id}
                                                >
                                                    <RefreshCw size={14} className={syncing === repo.id ? 'animate-spin' : ''} />
                                                </button>
                                                <button
                                                    className="btn-ghost p-1.5 hover:text-red-500"
                                                    title="Remove"
                                                    onClick={() => removeRepo(repo.id)}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
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
                onClose={() => { setShowAdd(false); setRepoUrl(''); setAddError(null) }}
                title="Add GitHub Repository"
                footer={
                    <>
                        <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                        <button className="btn-primary" onClick={handleAdd} disabled={adding || !repoUrl.trim()}>
                            {adding ? <><Spinner size="sm" /> Adding…</> : <><Plus size={14} /> Add</>}
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    {addError && <ErrorBanner message={addError} />}
                    <div>
                        <label className="label">Repository URL or owner/name</label>
                        <input
                            className="input"
                            placeholder="e.g. ayush/cicd-analyzer or https://github.com/ayush/cicd-analyzer"
                            value={repoUrl}
                            onChange={e => setRepoUrl(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            autoFocus
                        />
                        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                            <AlertCircle size={11} />
                            Only public repos or repos your GitHub OAuth token has access to.
                        </p>
                    </div>
                </div>
            </Modal>

        </div>
    )
}