// ── AI Insight Card ────────────────────────────────────────────────────────────
// src/components/AiInsightCard.jsx
// Full analysis card for the run detail page.

export function AiInsightCard({ analysis }) {
    if (!analysis) return null;

    const {
        summary,
        failureCategory,
        severity,
        affectedComponent,
        remediationSteps = [],
        similarPatterns = [],
        confidenceScore,
        classificationSource,
    } = analysis;

    return (
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🧠</span>
                    <span className="font-semibold text-sm">AI Root Cause Analysis</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {failureCategory && <FailureBadge category={failureCategory} />}
                    {severity && <SeverityBadge severity={severity} />}
                </div>
            </div>

            {/* Summary */}
            <p className="text-sm leading-relaxed text-white/80">{summary}</p>

            {/* Affected component */}
            {affectedComponent && (
                <div className="rounded-md bg-black/20 px-3 py-2 text-xs">
                    <span className="opacity-50">Affected: </span>
                    <code className="text-yellow-300">{affectedComponent}</code>
                </div>
            )}

            {/* Remediation steps */}
            {remediationSteps.length > 0 && (
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-2">
                        Remediation Steps
                    </p>
                    <ol className="space-y-1.5">
                        {remediationSteps.map((step, i) => (
                            <li key={i} className="flex gap-2 text-sm">
                                <span className="text-purple-400 font-mono text-xs mt-0.5 flex-shrink-0">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <span className="text-white/75">{step}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )}

            {/* Similar patterns */}
            {similarPatterns.length > 0 && (
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-2">
                        Similar Patterns
                    </p>
                    <ul className="space-y-1">
                        {similarPatterns.map((p, i) => (
                            <li key={i} className="text-xs text-white/60 flex gap-1.5">
                                <span className="text-purple-400">›</span> {p}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Footer meta */}
            <div className="flex items-center gap-3 pt-1 border-t border-white/5 text-xs opacity-40">
                {confidenceScore != null && (
                    <span>Confidence: {Math.round(confidenceScore * 100)}%</span>
                )}
                {classificationSource && (
                    <span>Source: {classificationSource}</span>
                )}
            </div>
        </div>
    );
}