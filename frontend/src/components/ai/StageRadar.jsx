// ═══════════════════════════════════════════════════════════════════════════════
// src/components/ai/StageRadar.jsx
// ═══════════════════════════════════════════════════════════════════════════════
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis,
    ResponsiveContainer, Tooltip,
} from 'recharts'

const DEFAULT_DATA = [
    { stage: 'Checkout', value: 98 },
    { stage: 'Build', value: 74 },
    { stage: 'Test', value: 52 },
    { stage: 'Docker', value: 88 },
    { stage: 'Deploy', value: 81 },
]

export function StageRadar({ data = DEFAULT_DATA }) {
    return (
        <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="rgba(148,163,184,0.18)" />
                <PolarAngleAxis dataKey="stage" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Radar
                    dataKey="value"
                    stroke="#6366f1" fill="#6366f1" fillOpacity={0.22}
                    strokeWidth={2} dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                />
                <Tooltip
                    formatter={v => [`${v}%`, 'Health']}
                    contentStyle={{ borderRadius: '10px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                />
            </RadarChart>
        </ResponsiveContainer>
    )
}
