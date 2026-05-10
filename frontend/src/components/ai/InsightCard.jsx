// ═══════════════════════════════════════════════════════════════════════════════
// src/components/ai/InsightCard.jsx
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { AlertTriangle, TrendingUp, Zap, ChevronRight } from 'lucide-react'

const SEV_CONFIG = {
    critical: {
        border: 'border-red-200   dark:border-red-900/60',
        bg: 'bg-red-50/60     dark:bg-red-900/10',
        icon: AlertTriangle, iconCls: 'text-red-500',
        badge: 'badge-danger',
    },
    warning: {
        border: 'border-amber-200 dark:border-amber-900/60',
        bg: 'bg-amber-50/60   dark:bg-amber-900/10',
        icon: TrendingUp, iconCls: 'text-amber-500',
        badge: 'badge-warning',
    },
    info: {
        border: 'border-brand-200 dark:border-brand-900/60',
        bg: 'bg-brand-50/60   dark:bg-brand-900/10',
        icon: Zap, iconCls: 'text-brand-500',
        badge: 'badge-info',
    },
}

export function InsightCard({ insight }) {
    const [open, setOpen] = useState(false)

    const sev = (insight.severity ?? insight.level ?? 'info').toLowerCase()
    const cfg = SEV_CONFIG[sev] ?? SEV_CONFIG.info
    const Icon = cfg.icon
    const title = insight.title ?? insight.summary ?? `Run #${insight.buildNumber} — ${insight.repoName}`
    const summ = insight.summary !== title ? (insight.summary ?? '') : ''
    const detail = insight.detail ?? insight.diagnosis ?? insight.result ?? ''
    const rec = insight.recommendation ?? ''
    const stage = insight.stage ?? insight.failingStage ?? ''
    const repo = insight.repoName ?? ''

    return (
        <div className={`rounded-xl border p-4 transition-all ${cfg.border} ${cfg.bg}`}>
            <div
                className="flex items-start gap-3 cursor-pointer select-none"
                onClick={() => setOpen(o => !o)}
            >
                <Icon size={17} className={`mt-0.5 flex-shrink-0 ${cfg.iconCls}`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`badge text-xs ${cfg.badge} capitalize`}>{sev}</span>
                        {stage && <span className="text-xs text-gray-400">{stage}</span>}
                        {repo && <span className="font-mono text-xs text-gray-400">{repo}</span>}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">{title}</p>
                    {summ && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{summ}</p>}
                </div>
                <ChevronRight
                    size={15}
                    className={`text-gray-400 flex-shrink-0 mt-0.5 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                />
            </div>

            {open && (detail || rec) && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3 animate-slide-up">
                    {detail && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{detail}</p>
                    )}
                    {rec && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-3">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">💡 Recommendation</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{rec}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}