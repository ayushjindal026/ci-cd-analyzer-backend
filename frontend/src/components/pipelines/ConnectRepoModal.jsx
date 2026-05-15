import { useState, useEffect, useCallback } from 'react'
import {
    Search, GitBranch, Lock, Globe, Star,
    CheckCircle2, Plus, RefreshCw, AlertCircle
} from 'lucide-react'
import { githubApi, repoApi } from '@/api/client'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'

// ── Single GitHub repo row ────────────────────────────────────────────────────
function RepoRow({ repo, isConnected, onConnect, connecting }) {
    const isConnecting = connecting === repo.fullName

    return (
        <div className={`
      flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
      ${isConnected
                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
                : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'}
    `}>

            {/* Icon */}
            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <GitBranch size={15} className="text-brand-500" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {repo.fullName}
                    </p>
                    {repo.isPrivate
                        ? <Lock size={11} className="text-amber-500 flex-shrink-0" />
                        : <Globe size={11} className="text-gray-400 flex-shrink-0" />}
                    {repo.language && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full
                             bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            {repo.language}
                        </span>
                    )}
                </div>
                {repo.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{repo.description}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-400 font-mono">{repo.defaultBranch}</span>
                    {repo.stargazersCount > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                            <Star size={9} /> {repo.stargazersCount}
                        </span>
                    )}
                </div>
            </div>

            {/* Action */}
            {isConnected ? (
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                    <CheckCircle2 size={14} />
                    Connected
                </div>
            ) : (
                <button
                    onClick={() => onConnect(repo)}
                    disabled={isConnecting}
                    className="btn-primary btn-sm flex-shrink-0"
                >
                    {isConnecting
                        ? <><Spinner size="sm" /> Connecting…</>
                        : <><Plus size={13} /> Connect</>}
                </button>
            )}
        </div>
    )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export function ConnectRepoModal({ open, onClose, onConnected, connectedRepos = [] }) {
    const { toast } = useToast()
    const [repos, setRepos] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [query, setQuery] = useState('')
    const [connecting, setConnecting] = useState(null)

    // ── Fetch from GitHub on open ─────────────────────────────────────────────
    const fetchRepos = useCallback(async () => {
        setLoading(true); setError(null)
        try {
            const res = await githubApi.listUserRepos({ sort: 'pushed', per_page: 50 })
            setRepos(res.data ?? [])
        } catch (e) {
            setError(e.response?.data?.message ?? 'Failed to load your GitHub repositories.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { if (open) fetchRepos() }, [open, fetchRepos])

    // ── Filter ────────────────────────────────────────────────────────────────
    const filtered = query.trim()
        ? repos.filter(r =>
            r.fullName.toLowerCase().includes(query.toLowerCase()) ||
            r.name.toLowerCase().includes(query.toLowerCase()))
        : repos

    // ── Connect ───────────────────────────────────────────────────────────────
    const handleConnect = async (ghRepo) => {
        setConnecting(ghRepo.fullName)
        try {
            // Split "owner/repo" → owner + repoName
            const [owner, repoName] = ghRepo.fullName.split('/')
            await repoApi.add({
                owner,
                repoName,
                source: 'GITHUB',
                defaultBranch: ghRepo.defaultBranch ?? 'main',
            })
            toast.success('Repository connected!', `${ghRepo.fullName} is now being monitored.`)
            onConnected?.()
        } catch (e) {
            const msg = e.response?.data?.message ?? 'Failed to connect repository.'
            toast.error('Connection failed', msg)
        } finally {
            setConnecting(null)
        }
    }

    // ── Set of already-connected full names ───────────────────────────────────
    const connectedSet = new Set(
        connectedRepos.map(r => `${r.owner}/${r.repoName}`)
    )

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="lg"
            title="Connect a GitHub Repository"
            footer={
                <button className="btn-secondary" onClick={onClose}>Close</button>
            }
        >
            <div className="space-y-4">

                {/* Search */}
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        className="input pl-9"
                        placeholder="Search your repositories…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20
                          border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                        <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                        <div className="flex-1">{error}</div>
                        <button onClick={fetchRepos} className="text-xs hover:underline flex-shrink-0">Retry</button>
                    </div>
                )}

                {/* List */}
                <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">

                    {loading && (
                        <div className="flex flex-col items-center py-16 gap-3">
                            <Spinner size="lg" />
                            <p className="text-sm text-gray-400">Loading your GitHub repositories…</p>
                        </div>
                    )}

                    {!loading && !error && filtered.length === 0 && (
                        <div className="flex flex-col items-center py-12 text-center">
                            <GitBranch size={32} className="text-gray-300 dark:text-gray-700 mb-3" />
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                {query ? `No repositories matching "${query}"` : 'No repositories found'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                Make sure your GitHub token has <code className="font-mono">repo</code> or <code className="font-mono">public_repo</code> scope.
                            </p>
                        </div>
                    )}

                    {!loading && filtered.map(repo => (
                        <RepoRow
                            key={repo.id ?? repo.fullName}
                            repo={repo}
                            isConnected={connectedSet.has(repo.fullName)}
                            onConnect={handleConnect}
                            connecting={connecting}
                        />
                    ))}
                </div>

                {/* Footer meta */}
                {!loading && repos.length > 0 && (
                    <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                        <span>{filtered.length} repo{filtered.length !== 1 ? 's' : ''}{query ? ' found' : ' available'}</span>
                        <button
                            onClick={fetchRepos}
                            className="flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            <RefreshCw size={11} /> Refresh
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    )
}