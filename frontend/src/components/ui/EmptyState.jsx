// ═══════════════════════════════════════════════════════════════════════════════
// src/components/ui/EmptyState.jsx
// ═══════════════════════════════════════════════════════════════════════════════
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Icon size={24} className="text-gray-400 dark:text-gray-600" />
        </div>
      )}
      <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1.5 max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}