// ─── src/components/ui/Spinner.jsx ───────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }) {
    const sz = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }[size]
    return (
        <div className={`${sz} animate-spin rounded-full border-2 border-gray-200 border-t-brand-600 ${className}`} />
    )
}

export function FullPageSpinner() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <Spinner size="lg" />
        </div>
    )
}