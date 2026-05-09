// ─── src/components/charts/FailureRateChart.jsx ───────────────────────────────
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { format, parseISO } from 'date-fns'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
        {label ? format(parseISO(label), 'MMM d, yyyy') : ''}
      </p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500 dark:text-gray-400 capitalize">{p.name}:</span>
          <span className="font-medium text-gray-800 dark:text-gray-100">{p.value}%</span>
        </div>
      ))}
    </div>
  )
}

/**
 * @param {Array}  data  - [{ date: 'YYYY-MM-DD', failureRate: number, successRate: number }]
 * @param {number} threshold - red reference line (default 20)
 */
export function FailureRateChart({ data = [], threshold = 20, height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradFailure" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />

        <XAxis
          dataKey="date"
          tickFormatter={d => { try { return format(parseISO(d), 'MMM d') } catch { return d } }}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => `${v}%`}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          domain={[0, 100]}
        />

        <Tooltip content={<CustomTooltip />} />

        <ReferenceLine
          y={threshold}
          stroke="#ef4444"
          strokeDasharray="4 3"
          strokeOpacity={0.6}
          label={{ value: `Alert ${threshold}%`, position: 'right', fontSize: 10, fill: '#ef4444' }}
        />

        <Area
          type="monotone"
          dataKey="successRate"
          name="success"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#gradSuccess)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="failureRate"
          name="failure"
          stroke="#ef4444"
          strokeWidth={2}
          fill="url(#gradFailure)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}