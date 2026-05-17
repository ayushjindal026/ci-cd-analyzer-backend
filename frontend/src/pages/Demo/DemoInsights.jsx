// ═══════════════════════════════════════════════════════════════════════════════
// src/pages/Demo/DemoInsights.jsx
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Brain, Sparkles, ChevronRight, AlertTriangle, TrendingUp, Zap, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useDemo } from '@/demo/DemoContext'
import { ScoreGauge } from '@/components/ai/ScoreGauge'
import { StageRadar } from '@/components/ai/StageRadar'
import { formatDistanceToNow } from 'date-fns'

const SEV_CFG = {
    critical: { cls: 'border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-900/10', icon: AlertTriangle, iconCls: 'text-red-500', badge: 'badge-danger' },
    warning: { cls: 'border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-900/10', icon: TrendingUp, iconCls: 'text-amber-500', badge: 'badge-warning' },
    info: { cls: 'border-brand-200 dark:border-brand-900/60 bg-brand-50/50 dark:bg-brand-900/10', icon: Zap, iconCls: 'text-brand-500', badge: 'badge-info' },
}

function InsightCard({ insight }) {
    const [open, setOpen] = useState(false)
    const cfg = SEV_CFG[insight.severity] ?? SEV_CFG.info
    const Icon = cfg.icon

    return (
        <div className={`rounded-xl border p-4 transition-all ${cfg.cls}`}>
            <div className="flex items-start gap-3 cursor-pointer select-none" onClick={() => setOpen(o => !o)}>
                <Icon size={17} className={`mt-0.5 flex-shrink-0 ${cfg.iconCls}`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`badge text-xs ${cfg.badge} capitalize`}>{insight.severity}</span>
                        <span className="text-xs text-gray-400">{insight.stage}</span>
                        <span className="font-mono text-xs text-gray-400">{insight.repoName}</span>
                        <span className="badge-neutral text-xs">{insight.priority}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{insight.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{insight.summary}</p>
                </div>
                <ChevronRight size={15} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
            </div>

            {open && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3 animate-slide-up">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Diagnosis</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{insight.diagnosis}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-3 space-y-2">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">💡 Remediation Steps</p>
                        <ol className="space-y-1">
                            {insight.remediationSteps.map((step, i) => (
                                <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex gap-2">
                                    <span className="text-brand-500 font-bold flex-shrink-0">{i + 1}.</span>
                                    {step}
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                        <span>Est. fix: <strong className="text-gray-600 dark:text-gray-300">{insight.estimatedFixTime}</strong></span>
                        {insight.isFlaky && <span className="badge-warning">Flaky test</span>}
                        <span>Model: <code className="font-mono">{insight.modelUsed}</code></span>
                        <span>Analysed {formatDistanceToNow(new Date(insight.analysedAt), { addSuffix: true })}</span>
                    </div>
                </div>
            )}
        </div>
    )
}

export function DemoInsights() {
    const { insights, triggerAnalysis } = useDemo()
    const [triggered, setTriggered] = useState(false)
    const critCount = insights.filter(i => i.severity === 'critical').length
    const score = Math.max(10, 100 - critCount * 18 - (insights.length - critCount) * 6)

    const radarData = [
        { stage: 'Checkout', value: 97 },
        { stage: 'Build', value: 69 },
        { stage: 'Test', value: 58 },
        { stage: 'Train', value: 41 },
        { stage: 'Deploy', value: 88 },
    ]

    return (
        <div className="space-y-6">
            <DemoBadge />

            <div className="card p-5 bg-gradient-to-r from-brand-600 to-indigo-700 border-0 text-white">
                <div className="flex items-center gap-3 mb-1">
                    <Brain size={22} />
                    <h2 className="text-lg font-bold">AI Pipeline Intelligence</h2>
                </div>
                <p className="text-brand-100 text-sm max-w-xl">
                    4 issues detected across your pipelines. 1 critical needs immediate attention.
                    All analysis is pre-computed for this demo — click any card to see the full AI diagnosis.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="space-y-5">
                    <div className="card p-5 flex flex-col items-center gap-4">
                        <h3 className="section-title self-start">Pipeline Health Score</h3>
                        <ScoreGauge score={score} />
                    </div>
                    <div className="card p-5">
                        <h3 className="section-title mb-3">Stage Health Radar</h3>
                        <StageRadar data={radarData} />
                    </div>
                    <div className="card p-5 space-y-3">
                        <h3 className="section-title">Prediction Signals</h3>
                        {[
                            { label: 'Failure prob. (next run)', value: '28%', cls: 'text-amber-600 dark:text-amber-400' },
                            { label: 'Most likely failing stage', value: 'Train', cls: 'text-red-600   dark:text-red-400' },
                            { label: 'Est. MTTR', value: '22m', cls: 'text-brand-600 dark:text-brand-400' },
                            { label: 'Flaky tests detected', value: '1', cls: 'text-amber-600 dark:text-amber-400' },
                            { label: 'Health trend (7 days)', value: '↓ stable', cls: 'text-emerald-600 dark:text-emerald-400' },
                        ].map(({ label, value, cls }) => (
                            <div key={label} className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{label}</span>
                                <span className={`font-semibold ${cls}`}>{value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Demo trigger panel */}
                    <div className="card p-5 space-y-3">
                        <h3 className="section-title">Trigger AI Analysis</h3>
                        <p className="muted text-xs">Simulate triggering analysis on a failed run.</p>
                        {triggered ? (
                            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-2.5">
                                <CheckCircle2 size={13} /> Analysis queued! Check notifications.
                            </div>
                        ) : (
                            <button
                                className="btn-primary w-full"
                                onClick={() => { triggerAnalysis(3, 103); setTriggered(true) }}
                            >
                                <Zap size={14} /> Analyse ml-pipeline #94
                            </button>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="section-title flex items-center gap-2">
                            Detected Issues
                            <span className="badge-danger">{critCount} critical</span>
                        </h3>
                        <button className="btn-secondary btn-sm" onClick={() => { }}>
                            <RefreshCw size={13} /> Re-analyse
                        </button>
                    </div>
                    {insights.map(ins => <InsightCard key={ins.id} insight={ins} />)}
                </div>
            </div>
        </div>
    )
}