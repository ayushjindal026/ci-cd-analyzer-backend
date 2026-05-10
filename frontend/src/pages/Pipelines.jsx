// ═══════════════════════════════════════════════════════════════════════════════
// src/pages/Pipelines.jsx  — now thin: delegates to component folder
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { useRepositories } from '@/hooks/useRepositories'
import { useToast } from '@/components/ui/Toast'
import { ErrorBanner } from '@/components/ui'
import { SummaryBar } from '@/components/pipelines/SummaryBar'
import { RepoTable } from '@/components/pipelines/RepoTable'
import { AddRepoModal } from '@/components/pipelines/AddRepoModal'

export default function Pipelines() {
    const { toast } = useToast()
    const { repos, loading, error, refetch, addRepo, removeRepo, syncRepo } = useRepositories()
    const [showAdd, setShowAdd] = useState(false)

    const handleAdd = async repoUrl => {
        const repo = await addRepo({ repoUrl })
        toast.success('Repository added', `${repo.fullName ?? repo.name} is now being tracked.`)
    }

    const handleSync = async id => {
        const repo = repos.find(r => r.id === id)
        try {
            await syncRepo(id)
            toast.success('Synced', `${repo?.fullName ?? 'Repository'} synced successfully.`)
        } catch {
            toast.error('Sync failed', 'Could not sync repository. Try again.')
        }
    }

    const handleRemove = async id => {
        const repo = repos.find(r => r.id === id)
        try {
            await removeRepo(id)
            toast.success('Removed', `${repo?.fullName ?? 'Repository'} disconnected.`)
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
                    <button className="btn-secondary btn-sm" onClick={refetch} disabled={loading}>
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
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

            <AddRepoModal
                open={showAdd}
                onClose={() => setShowAdd(false)}
                onAdd={handleAdd}
            />
        </div>
    )
}