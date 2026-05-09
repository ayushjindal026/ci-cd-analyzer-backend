// ═══════════════════════════════════════════════════════════════════════════════
// src/components/ui/ErrorBanner.jsx
// ═══════════════════════════════════════════════════════════════════════════════
export function ErrorBanner({ message, onRetry }) {
    return (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <span className="text-red-500 flex-shrink-0 mt-0.5 text-base">⚠</span>
            <p className="text-sm text-red-700 dark:text-red-400 flex-1">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline flex-shrink-0"
                >
                    Retry
                </button>
            )}
        </div>
    )
}
