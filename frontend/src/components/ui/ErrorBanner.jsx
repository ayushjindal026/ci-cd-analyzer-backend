// ─── src/components/ui/ErrorBanner.jsx ───────────────────────────────────────
export function ErrorBanner({ message, onRetry }) {
    return (
        <div className="card p-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 flex items-start gap-3">
            <span className="text-red-500 mt-0.5">⚠</span>
            <div className="flex-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">{message}</p>
            </div>
            {onRetry && (
                <button className="btn-sm btn-secondary text-xs" onClick={onRetry}>Retry</button>
            )}
        </div>
    )
}
