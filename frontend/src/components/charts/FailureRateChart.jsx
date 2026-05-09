// ═══════════════════════════════════════════════════════════════════════════════
// src/components/charts/FailureRateChart.jsx
// ═══════════════════════════════════════════════════════════════════════════════
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,        // ← all explicit
} from 'recharts'
import { format, parseISO, isValid } from 'date-fns'

function safeDate(d) {
  try { const p = parseISO(d); return isValid(p) ? format(p, 'MMM d') : d } catch { return d }
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">{safeDate(label)}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500 dark:text-gray-400 capitalize">{p.name}:</span>
          <span className="font-semibold text-gray-800 dark:text-gray-100">{p.value}%</span>
        </div>
      ))}
    </div>
  )
}

export function FailureRateChart({ data = [], threshold = 20, height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gFail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gSuccess" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={safeDate}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tickFormatter={v => `${v}%`}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false} tickLine={false}
          domain={[0, 100]}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={threshold}
          stroke="#ef4444" strokeDasharray="5 3" strokeOpacity={0.5}
          label={{ value: `${threshold}% alert`, position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }}
        />
        <Area type="monotone" dataKey="successRate" name="success"
          stroke="#10b981" strokeWidth={2} fill="url(#gSuccess)"
          dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        <Area type="monotone" dataKey="failureRate" name="failure"
          stroke="#ef4444" strokeWidth={2} fill="url(#gFail)"
          dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}