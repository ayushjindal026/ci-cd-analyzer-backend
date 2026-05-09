// ═══════════════════════════════════════════════════════════════════════════════
// src/components/charts/SuccessRatioChart.jsx
// ═══════════════════════════════════════════════════════════════════════════════
import {
    PieChart, Pie, Cell, Legend, Tooltip as PieTooltip, ResponsiveContainer,
} from 'recharts'

const PIE_COLORS = {
    Success: '#10b981',
    Failed: '#ef4444',
    Running: '#3b82f6',
    Pending: '#f59e0b',
    Cancelled: '#6b7280',
}

const RADIAN = Math.PI / 180
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.06) return null
    const r = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + r * Math.cos(-midAngle * RADIAN)
    const y = cy + r * Math.sin(-midAngle * RADIAN)
    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    )
}

export function SuccessRatioChart({ data = [], height = 260 }) {
    const filled = data.filter(d => d.value > 0)
    const display = filled.length ? filled : [{ name: 'No data', value: 1 }]

    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart>
                <Pie
                    data={display}
                    cx="50%" cy="50%"
                    innerRadius={58} outerRadius={92}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={renderLabel}
                >
                    {display.map(entry => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name] ?? '#94a3b8'} stroke="transparent" />
                    ))}
                </Pie>
                <PieTooltip
                    formatter={(v, n) => [`${v} runs`, n]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend
                    iconType="circle" iconSize={8}
                    formatter={v => <span style={{ fontSize: '12px', color: '#64748b' }}>{v}</span>}
                />
            </PieChart>
        </ResponsiveContainer>
    )
}