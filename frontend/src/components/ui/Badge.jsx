// ─── src/components/ui/Badge.jsx ─────────────────────────────────────────────
export function Badge({ status, children }) {
  const map = {
    success:  'badge-success',
    failed:   'badge-danger',
    failure:  'badge-danger',
    running:  'badge-info',
    pending:  'badge-warning',
    skipped:  'badge-neutral',
    cancelled:'badge-neutral',
  }
  const cls = map[status?.toLowerCase()] ?? 'badge-neutral'
  const dot = {
    success: 'bg-emerald-500', failed: 'bg-red-500', failure: 'bg-red-500',
    running: 'bg-blue-500 animate-pulse', pending: 'bg-amber-500',
  }[status?.toLowerCase()]

  return (
    <span className={cls}>
      {dot && <span className={`status-dot ${dot}`} />}
      {children ?? status}
    </span>
  )
}