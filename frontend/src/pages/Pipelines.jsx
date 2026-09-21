import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { useRepositories } from '@/hooks/useRepositories'
import { useToast } from '@/components/ui/Toast'
import { ErrorBanner } from '@/components/ui'
import { SummaryBar } from '@/components/pipelines/SummaryBar'
import { RepoTable } from '@/components/pipelines/RepoTable'
import { ConnectRepoModal } from '@/components/pipelines/ConnectRepoModal'

export default function Pipelines() {
    const { toast } = useToast()
    const { repos, loading, error, refetch, removeRepo, syncRepo } = useRepositories()
    const [showAdd, setShowAdd] = useState(false)

    const handleConnected = () => {
        setShowAdd(false)
        refetch()
        toast.success('Repository connected', 'Your repository is now being monitored.')
    }

    const handleSync = async id => {
        const repo = repos.find(r => r.id === id)
        try {
            await syncRepo(id)
            toast.success('Synced', `${repo?.repoName ?? 'Repository'} synced successfully.`)
        } catch {
            toast.error('Sync failed', 'Could not sync repository. Try again.')
        }
    }

    const handleRemove = async id => {
        const repo = repos.find(r => r.id === id)
        try {
            await removeRepo(id)
            toast.success('Removed', `${repo?.repoName ?? 'Repository'} disconnected.`)
        } catch {
            toast.error('Remove failed', 'Could not remove repository.')
        }
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="muted">Connect and monitor your GitHub CI/CD repositories.</p>
                <div className="flex items-center gap-2">
                    <button
                        className="btn-secondary btn-sm"
                        onClick={refetch}
                        disabled={loading}
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button className="btn-primary" onClick={() => setShowAdd(true)}>
                        <Plus size={15} /> Add Repository
                    </button>
                </div>
            </div>

            {error && <ErrorBanner message={error} onRetry={refetch} />}
            {!loading && repos.length > 0 && <SummaryBar repos={repos} />}

            <RepoTable
                repos={repos}
                loading={loading}
                onSync={handleSync}
                onRemove={handleRemove}
                onAddClick={() => setShowAdd(true)}
            />

            <ConnectRepoModal
                open={showAdd}
                onClose={() => setShowAdd(false)}
                onConnected={handleConnected}
                connectedRepos={repos}
            />
        </div>
    )
}