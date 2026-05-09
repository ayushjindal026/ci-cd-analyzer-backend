// ─── src/components/ui/EmptyState.jsx ────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon size={40} className="text-gray-300 dark:text-gray-700 mb-4" />}
      <p className="font-semibold text-gray-700 dark:text-gray-300">{title}</p>
      {description && <p className="muted mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}