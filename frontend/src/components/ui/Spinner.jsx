// ═══════════════════════════════════════════════════════════════════════════════
// src/components/ui/Spinner.jsx
// ═══════════════════════════════════════════════════════════════════════════════
export function Spinner({ size = 'md', className = '' }) {
    const sz = { sm: 'h-3.5 w-3.5 border', md: 'h-5 w-5 border-2', lg: 'h-10 w-10 border-2' }[size] ?? 'h-5 w-5 border-2'
    return (
        <div className={`${sz} animate-spin rounded-full border-gray-200 border-t-brand-600 ${className}`} />
    )
}
export function FullPageSpinner() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-950">
            <Spinner size="lg" />
            <p className="text-sm text-gray-400">Loading…</p>
        </div>
    )
}