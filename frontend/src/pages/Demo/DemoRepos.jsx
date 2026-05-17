// ═══════════════════════════════════════════════════════════════════════════════
// src/pages/Demo/DemoRepos.jsx
// ═══════════════════════════════════════════════════════════════════════════════
import { Link } from 'react-router-dom'
import { GitBranch, ArrowUpRight, Activity } from 'lucide-react'
import { useDemo } from '@/demo/DemoContext'
import { Badge } from '@/components/ui/Badge'
import { formatDistanceToNow } from 'date-fns'

const LANG_CLS = {
    Java: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    TypeScript: 'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300',
    Python: 'bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300',
    HCL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
}

function HealthBar({ rate }) {
    const color = rate >= 85 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-red-500'
    const text = rate >= 85 ? 'text-emerald-600 dark:text-emerald-400'
        : rate >= 60 ? 'text-amber-600 dark:text-amber-400'
            : 'text-red-600 dark:text-red-400'
    return (
        <div className="min-w-[110px]">
            <p className={`text-sm font-bold mb-1 ${text}`}>{rate}%</p>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                <div className={`${color} h-1.5 rounded-full`} style={{ width: `${rate}%` }} />
            </div>
        </div>
    )
}

export function DemoRepos() {
    const { repos } = useDemo()

    return (
        <div className="space-y-5">
            <DemoBadge />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Connected repos', value: repos.length, cls: 'text-brand-600 dark:text-brand-400' },
                    { label: 'Total runs', value: repos.reduce((s, r) => s + r.totalRuns, 0).toLocaleString(), cls: 'text-gray-900 dark:text-gray-100' },
                    { label: 'Avg health', value: `${Math.round(repos.reduce((s, r) => s + r.successRate, 0) / repos.length)}%`, cls: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'Currently live', value: repos.filter(r => r.lastRunStatus === 'running').length, cls: 'text-blue-600 dark:text-blue-400' },
                ].map(({ label, value, cls }) => (
                    <div key={label} className="card p-4">
                        <p className="text-xs text-gray-400 mb-1">{label}</p>
                        <p className={`text-xl font-bold ${cls}`}>{value}</p>
                    </div>
                ))}
            </div>

            <div className="table-wrapper">
                <table>
                    <thead><tr>
                        <th>Repository</th><th>Language</th><th>Health</th>
                        <th>Runs</th><th>Last run</th><th>Status</th><th className="text-right pr-4">Actions</th>
                    </tr></thead>
                    <tbody>
                        {repos.map(repo => (
                            <tr key={repo.id}>
                                <td>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                            <GitBranch size={14} className="text-brand-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{repo.fullName}</p>
                                            <a href={`https://github.com/${repo.fullName}`} target="_blank" rel="noreferrer"
                                                className="text-xs text-brand-500 hover:underline flex items-center gap-0.5">
                                                GitHub <ArrowUpRight size={10} />
                                            </a>
                                        </div>
                                    </div>
                                </td>
                                <td><span className={`badge text-xs ${LANG_CLS[repo.language] ?? 'badge-neutral'}`}>{repo.language}</span></td>
                                <td><HealthBar rate={repo.successRate} /></td>
                                <td><span className="font-mono text-sm font-semibold">{repo.totalRuns.toLocaleString()}</span></td>
                                <td className="text-xs text-gray-400 whitespace-nowrap">
                                    {formatDistanceToNow(new Date(repo.lastRunAt), { addSuffix: true })}
                                </td>
                                <td><Badge status={repo.lastRunStatus} /></td>
                                <td>
                                    <div className="flex items-center justify-end gap-1 pr-1">
                                        <Link to="/demo/runs" className="btn-ghost p-1.5 rounded-md" title="View runs">
                                            <Activity size={14} />
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}