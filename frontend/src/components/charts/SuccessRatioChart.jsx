// ─── src/components/charts/SuccessRatioChart.jsx ─────────────────────────────
import { PieChart, Pie, Cell, Legend, Tooltip as PTooltip } from 'recharts'

const RADIAN = Math.PI / 180
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null
    const r = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + r * Math.cos(-midAngle * RADIAN)
    const y = cy + r * Math.sin(-midAngle * RADIAN)
    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    )
}

const PIE_COLORS = {
    Success: '#10b981',
    Failed: '#ef4444',
    Running: '#3b82f6',
    Pending: '#f59e0b',
    Cancelled: '#6b7280',
}

/** @param {Array} data - [{ name: 'Success'|'Failed'|..., value: number }] */
export function SuccessRatioChart({ data = [], height = 260 }) {
    const filled = data.length
        ? data
        : [{ name: 'No data', value: 1 }]

    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart>
                <Pie
                    data={filled}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomLabel}
                >
                    {filled.map((entry, i) => (
                        <Cell
                            key={entry.name}
                            fill={PIE_COLORS[entry.name] ?? '#94a3b8'}
                            stroke="transparent"
                        />
                    ))}
                </Pie>
                <PTooltip
                    formatter={(v, n) => [`${v} runs`, n]}
                    contentStyle={{
                        borderRadius: '12px', border: '1px solid #e2e8f0',
                        fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                />
                <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={v => <span style={{ fontSize: '12px', color: '#64748b' }}>{v}</span>}
                />
            </PieChart>
        </ResponsiveContainer>
    )
}
