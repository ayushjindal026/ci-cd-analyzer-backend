// ═══════════════════════════════════════════════════════════════════════════════
// src/components/ui/Badge.jsx
// ═══════════════════════════════════════════════════════════════════════════════
export function Badge({ status, children }) {
  const s = (status ?? '').toLowerCase()
  const map = {
    success: 'badge-success',
    failed: 'badge-danger',
    failure: 'badge-danger',
    running: 'badge-info',
    pending: 'badge-warning',
    skipped: 'badge-neutral',
    cancelled: 'badge-neutral',
    canceled: 'badge-neutral',
  }
  const dotMap = {
    success: 'bg-emerald-500',
    running: 'bg-blue-500 animate-pulse',
    failed: 'bg-red-500',
    failure: 'bg-red-500',
    pending: 'bg-amber-500',
  }
  const cls = map[s] ?? 'badge-neutral'
  const dot = dotMap[s]

  return (
    <span className={cls}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />}
      {children ?? status}
    </span>
  )
}