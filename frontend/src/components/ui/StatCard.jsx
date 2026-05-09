// ═══════════════════════════════════════════════════════════════════════════════
// src/components/ui/StatCard.jsx
// ═══════════════════════════════════════════════════════════════════════════════
export function StatCard({ label, value, delta, deltaLabel, icon: Icon, accent = 'brand' }) {
  const accentMap = {
    success: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400',
    danger: 'text-red-500    bg-red-50    dark:bg-red-900/30    dark:text-red-400',
    info: 'text-blue-500   bg-blue-50   dark:bg-blue-900/30   dark:text-blue-400',
    brand: 'text-brand-600  bg-brand-50  dark:bg-brand-900/30  dark:text-brand-400',
    warning: 'text-amber-500  bg-amber-50  dark:bg-amber-900/30  dark:text-amber-400',
  }
  const iconCls = accentMap[accent] ?? accentMap.brand

  return (
    <div className="stat-card animate-fade-in group hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <p className="stat-label">{label}</p>
        {Icon && (
          <span className={`p-2 rounded-lg flex-shrink-0 ${iconCls}`}>
            <Icon size={17} />
          </span>
        )}
      </div>
      <p className="stat-value">{value ?? '—'}</p>
      {delta !== undefined && (
        <p className={`text-xs font-medium mt-1.5 flex items-center gap-1 ${delta >= 0 ? 'stat-delta-up' : 'stat-delta-down'}`}>
          <span>{delta >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(delta)}%</span>
          {deltaLabel && <span className="text-gray-400 font-normal">{deltaLabel}</span>}
        </p>
      )}
    </div>
  )
}