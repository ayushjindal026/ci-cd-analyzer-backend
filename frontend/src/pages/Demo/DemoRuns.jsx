// ═══════════════════════════════════════════════════════════════════════════════
// src/pages/Demo/DemoRuns.jsx
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import { useDemo } from '@/demo/DemoContext'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { RunDetailDrawer } from '@/components/runs/RunDetailDrawer'
import { formatDistanceToNow } from 'date-fns'

function fmtMs(ms) {
    if (!ms && ms !== 0) return '—'
    const s = Math.floor(ms / 1000)
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

function StageBars({ stages }) {
    return (
        <div className="flex gap-0.5 items-end">
            {stages.map((s, i) => (
                <div key={i} className={`w-2 h-4 rounded-sm ${s.status === 'SUCCESS' ? 'bg-emerald-500' :
                    s.status === 'FAILED' ? 'bg-red-500' :
                        s.status === 'RUNNING' ? 'bg-blue-500 animate-pulse' :
                            s.status === 'SKIPPED' ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`} title={`${s.name}: ${s.status}`} />
            ))}
        </div>
    )
}

const STATUS_OPTS = ['all', 'success', 'failed', 'running', 'pending']

export function DemoRuns() {
    const { runs, repos } = useDemo()
    const [statusFilter, setStatusFilter] = useState('all')
    const [repoFilter, setRepoFilter] = useState('all')
    const [selected, setSelected] = useState(null)

    const filtered = runs.filter(r => {
        const statusOk = statusFilter === 'all' || r.status.toLowerCase() === statusFilter
        const repoOk = repoFilter === 'all' || String(r.repoId) === repoFilter
        return statusOk && repoOk
    })

    return (
        <div className="space-y-5">
            <DemoBadge />

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <Filter size={14} className="text-gray-400 flex-shrink-0" />
                    <select
                        className="input h-8 text-xs w-auto"
                        value={repoFilter}
                        onChange={e => setRepoFilter(e.target.value)}
                    >
                        <option value="all">All repositories</option>
                        {repos.map(r => <option key={r.id} value={r.id}>{r.fullName}</option>)}
                    </select>
                    {STATUS_OPTS.map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize
                ${statusFilter === s
                                    ? 'bg-brand-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >{s}</button>
                    ))}
                    {(statusFilter !== 'all' || repoFilter !== 'all') && (
                        <button
                            onClick={() => { setStatusFilter('all'); setRepoFilter('all') }}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                        >
                            <X size={12} /> Clear
                        </button>
                    )}
                </div>
                <span className="text-xs text-gray-400">{filtered.length} run{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>#</th><th>Workflow</th><th>Branch</th>
                            <th>Status</th><th>Stages</th><th>Duration</th><th>Started</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr><td colSpan={7}>
                                <EmptyState icon={Filter} title="No runs match the current filters" />
                            </td></tr>
                        )}
                        {filtered.map(run => (
                            <tr key={run.id} className="cursor-pointer" onClick={() => setSelected(run)}>
                                <td className="font-mono text-xs text-gray-400">#{run.buildNumber}</td>
                                <td>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{run.workflowName}</p>
                                    <p className="text-xs text-gray-400">{run.repoName}</p>
                                </td>
                                <td><span className="font-mono badge-neutral text-xs">{run.branch}</span></td>
                                <td><Badge status={run.status.toLowerCase()} /></td>
                                <td><StageBars stages={run.stages} /></td>
                                <td className="font-mono text-sm">{fmtMs(run.durationMs)}</td>
                                <td className="text-xs text-gray-400 whitespace-nowrap">
                                    {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <RunDetailDrawer
                run={selected}
                repoId={selected?.repoId}
                open={selected !== null}
                onClose={() => setSelected(null)}
                demoMode
            />
        </div>
    )
}