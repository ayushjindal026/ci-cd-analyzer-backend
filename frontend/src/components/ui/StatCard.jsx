// ─── src/components/ui/StatCard.jsx ──────────────────────────────────────────
export function StatCard({ label, value, delta, deltaLabel, icon: Icon, accent }) {
  const isUp   = delta > 0
  const accentMap = {
    success: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30',
    danger:  'text-red-500 bg-red-50 dark:bg-red-900/30',
    info:    'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
    brand:   'text-brand-600 bg-brand-50 dark:bg-brand-900/30',
  }
  const iconCls = accentMap[accent] ?? accentMap.brand

  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between">
        <p className="stat-label">{label}</p>
        {Icon && (
          <span className={`p-2 rounded-lg ${iconCls}`}>
            <Icon size={18} />
          </span>
        )}
      </div>
      <p className="stat-value">{value ?? '—'}</p>
      {delta !== undefined && (
        <p className={delta >= 0 ? 'stat-delta-up' : 'stat-delta-down'}>
          {isUp ? '↑' : '↓'} {Math.abs(delta)}%
          {deltaLabel && <span className="muted ml-1">{deltaLabel}</span>}
        </p>
      )}
    </div>
  )
}
