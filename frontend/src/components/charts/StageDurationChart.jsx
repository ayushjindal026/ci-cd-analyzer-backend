// ─── src/components/charts/StageDurationChart.jsx ────────────────────────────
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as BTooltip, ResponsiveContainer as RC, Cell as BCell
} from 'recharts'

const STAGE_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

/**
 * @param {Array} data - [{ stage: 'Build', avgDuration: 45, maxDuration: 120 }]
 *                       durations in seconds
 */
export function StageDurationChart({ data = [], height = 260 }) {
    const fmt = s => s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`

    return (
        <RC width="100%" height={height}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                <XAxis
                    dataKey="stage"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    tickFormatter={fmt}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                />
                <BTooltip
                    formatter={(v, n) => [fmt(v), n === 'avgDuration' ? 'Avg Duration' : 'Max Duration']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="avgDuration" name="avgDuration" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {data.map((_, i) => (
                        <BCell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} fillOpacity={0.85} />
                    ))}
                </Bar>
                <Bar dataKey="maxDuration" name="maxDuration" radius={[6, 6, 0, 0]} maxBarSize={40} fill="#e2e8f0" fillOpacity={0.5} />
            </BarChart>
        </RC>
    )
}