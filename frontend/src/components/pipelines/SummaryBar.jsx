// ═══════════════════════════════════════════════════════════════════════════════
// src/components/pipelines/SummaryBar.jsx
// ═══════════════════════════════════════════════════════════════════════════════
export function SummaryBar({ repos }) {
    const total = repos.length
    const totalRuns = repos.reduce((s, r) => s + (r.totalRuns ?? 0), 0)
    const avgHealth = total
        ? Math.round(repos.reduce((s, r) => s + (r.successRate ?? 0), 0) / total)
        : 0
    const live = repos.filter(r => (r.lastRunStatus ?? '').toLowerCase() === 'running').length

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
                { label: 'Connected repos', value: total, cls: 'text-brand-600 dark:text-brand-400' },
                { label: 'Total runs', value: totalRuns.toLocaleString(), cls: 'text-gray-900  dark:text-gray-100' },
                { label: 'Avg success rate', value: `${avgHealth}%`, cls: avgHealth >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
                { label: 'Live pipelines', value: live, cls: live ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400' },
            ].map(({ label, value, cls }) => (
                <div key={label} className="card p-4">
                    <p className="text-xs text-gray-400 mb-1">{label}</p>
                    <p className={`text-xl font-bold ${cls}`}>{value}</p>
                </div>
            ))}
        </div>
    )
}