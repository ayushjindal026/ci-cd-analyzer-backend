// ─── src/components/ui/Tooltip.jsx ───────────────────────────────────────────
export function Tooltip({ text, children }) {
  return (
    <span className="relative group">
      {children}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md text-xs
                       bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900
                       opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {text}
      </span>
    </span>
  )
}