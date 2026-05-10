// ═══════════════════════════════════════════════════════════════════════════════
// src/components/ai/ScoreGauge.jsx
// ═══════════════════════════════════════════════════════════════════════════════
export function ScoreGauge({ score = 0 }) {
    const s = Math.min(100, Math.max(0, score))
    const color = s >= 80 ? '#10b981' : s >= 55 ? '#f59e0b' : '#ef4444'
    const label = s >= 80 ? 'Healthy' : s >= 55 ? 'At Risk' : 'Critical'
    const badge = s >= 80 ? 'badge-success' : s >= 55 ? 'badge-warning' : 'badge-danger'
    const C = 2 * Math.PI * 52
    const dash = (s / 100) * C

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative w-40 h-40">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb"
                        strokeWidth="10" className="dark:stroke-gray-700" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke={color}
                        strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={`${dash} ${C}`}
                        style={{ transition: 'stroke-dasharray 1.2s ease-out' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900 dark:text-gray-50">{s}</span>
                    <span className="text-xs text-gray-400">/ 100</span>
                </div>
            </div>
            <span className={`badge ${badge}`}>{label}</span>
            <p className="text-xs text-center text-gray-400 max-w-[160px] leading-relaxed">
                Computed from AI-detected failure patterns across your pipelines
            </p>
        </div>
    )
}