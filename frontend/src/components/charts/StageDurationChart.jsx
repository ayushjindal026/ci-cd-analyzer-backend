
// ═══════════════════════════════════════════════════════════════════════════════
// src/components/charts/StageDurationChart.jsx
// ═══════════════════════════════════════════════════════════════════════════════
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as BarTooltip, Cell as BarCell, ResponsiveContainer,
} from 'recharts'

const STAGE_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

function fmtSec(s) {
    if (!s) return '0s'
    return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`
}

export function StageDurationChart({ data = [], height = 260 }) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtSec} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <BarTooltip
                    formatter={(v, n) => [fmtSec(v), n === 'avgDuration' ? 'Avg' : 'Max']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="avgDuration" name="avgDuration" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {data.map((_, i) => (
                        <BarCell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} fillOpacity={0.9} />
                    ))}
                </Bar>
                <Bar dataKey="maxDuration" name="maxDuration" radius={[6, 6, 0, 0]} maxBarSize={44} fill="#e2e8f0" fillOpacity={0.45} />
            </BarChart>
        </ResponsiveContainer>
    )
}