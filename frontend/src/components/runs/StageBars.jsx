// ═══════════════════════════════════════════════════════════════════════════════
// src/components/runs/StageBars.jsx
// Mini coloured bar for each pipeline stage — shown inline in table rows
// ═══════════════════════════════════════════════════════════════════════════════
export function StageBars({ stages = [], runStatus }) {
    const bars = stages.length ? stages : inferBars(runStatus)
    return (
        <div className="flex gap-0.5 items-end">
            {bars.map((s, i) => {
                const st = (s.status ?? '').toUpperCase()
                const cls =
                    st === 'SUCCESS' ? 'bg-emerald-500' :
                        st === 'FAILED' ? 'bg-red-500' :
                            st === 'RUNNING' ? 'bg-blue-500 animate-pulse' :
                                st === 'CANCELLED' ? 'bg-gray-400' :
                                    st === 'SKIPPED' ? 'bg-gray-200 dark:bg-gray-700' :
                                        'bg-gray-200 dark:bg-gray-700'
                return (
                    <div
                        key={i}
                        title={s.name ? `${s.name}: ${s.status}` : s.status}
                        className={`w-2 h-4 rounded-sm ${cls}`}
                    />
                )
            })}
        </div>
    )
}

function inferBars(status) {
    const s = (status ?? '').toUpperCase()
    return [
        { status: 'SUCCESS' },
        { status: s === 'FAILED' ? 'FAILED' : 'SUCCESS' },
        { status: s === 'FAILED' ? 'SKIPPED' : s === 'RUNNING' ? 'RUNNING' : 'SUCCESS' },
        { status: s === 'SUCCESS' ? 'SUCCESS' : 'SKIPPED' },
    ]
}