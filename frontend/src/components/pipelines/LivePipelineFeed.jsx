// src/components/LivePipelineFeed.jsx
//
// Drop this anywhere on the repository detail page.
// It shows a real-time event stream and a connection status badge.

import { usePipelineSocket } from '../hooks/usePipelineSocket';

const EVENT_STYLES = {
    PIPELINE_QUEUED: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: '⏳', label: 'Queued' },
    PIPELINE_STARTED: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: '🚀', label: 'Started' },
    PIPELINE_COMPLETED: { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: '✅', label: 'Completed' },
    PIPELINE_FAILED: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: '❌', label: 'Failed' },
    STAGE_STARTED: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', icon: '▶️', label: 'Stage started' },
    STAGE_COMPLETED: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', icon: '☑️', label: 'Stage done' },
    ANALYSIS_READY: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: '🧠', label: 'AI analysis ready' },
    CONNECTED: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', icon: '🔌', label: 'Connected' },
};

function EventCard({ event }) {
    const style = EVENT_STYLES[event.eventType] || EVENT_STYLES.CONNECTED;
    const time = new Date(event.timestamp).toLocaleTimeString();

    return (
        <div className={`rounded-lg border px-4 py-3 text-sm ${style.bg} ${style.border} transition-all`}>
            <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                    {style.icon} {style.label}
                    {event.stageName && <span className="ml-1 opacity-70">— {event.stageName}</span>}
                </span>
                <span className="text-xs opacity-50 whitespace-nowrap">{time}</span>
            </div>

            {event.status && (
                <div className="mt-1 text-xs opacity-60">Status: {event.status}</div>
            )}

            {event.aiSummary && (
                <div className="mt-2 rounded bg-black/20 p-2 text-xs leading-relaxed">
                    <span className="font-semibold text-purple-300">AI: </span>
                    {event.aiSummary}
                </div>
            )}

            {event.failureCategory && (
                <div className="mt-1 text-xs">
                    <span className="opacity-60">Category: </span>
                    <span className="font-medium text-red-400">{event.failureCategory}</span>
                    {event.severity && (
                        <span className="ml-2 opacity-60">Severity: </span>
                    )}
                    {event.severity && (
                        <span className="font-medium">{event.severity}</span>
                    )}
                </div>
            )}
        </div>
    );
}

export function LivePipelineFeed({ repoId }) {
    const { connected, events, clearEvents } = usePipelineSocket(repoId);

    return (
        <div className="flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Live Feed</span>
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium
              ${connected
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-gray-500/20 text-gray-400 animate-pulse'
                            }`}
                    >
                        <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-500'}`} />
                        {connected ? 'Live' : 'Connecting…'}
                    </span>
                </div>
                {events.length > 0 && (
                    <button
                        onClick={clearEvents}
                        className="text-xs opacity-40 hover:opacity-70 transition-opacity"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Event stream */}
            {events.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 py-8 text-center text-sm opacity-40">
                    Waiting for pipeline events…
                </div>
            ) : (
                <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
                    {events.map((ev, i) => (
                        <EventCard key={`${ev.runId}-${ev.eventType}-${i}`} event={ev} />
                    ))}
                </div>
            )}
        </div>
    );
}