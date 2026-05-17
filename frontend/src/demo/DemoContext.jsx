import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
    DEMO_REPOS, DEMO_RUNS, DEMO_METRICS, DEMO_INSIGHTS, DEMO_NOTIFICATIONS,
} from './demoData'

const DemoContext = createContext(null)

/**
 * Wraps the demo dashboard with a self-contained data layer.
 * Simulates live updates by mutating run statuses on a timer.
 *
 * Rules:
 *   - "running" run eventually becomes "success"
 *   - A random new run appears every 45 seconds
 *   - Failure rate chart ticks up by ±1 each minute
 */
export function DemoProvider({ children }) {
    const [repos, setRepos] = useState(DEMO_REPOS)
    const [runs, setRuns] = useState(DEMO_RUNS)
    const [metrics, setMetrics] = useState(DEMO_METRICS)
    const [insights] = useState(DEMO_INSIGHTS)
    const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS)
    const [tick, setTick] = useState(0)          // forces re-renders

    // ── Simulated live run progression ────────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            setRuns(prev => {
                const updated = prev.map(r => {
                    if (r.status !== 'running') return r

                    // After ~30s the running run completes
                    const elapsedMs = Date.now() - new Date(r.startedAt).getTime()
                    if (elapsedMs > 30_000) {
                        return {
                            ...r,
                            status: 'success',
                            durationMs: elapsedMs,
                            stages: r.stages.map(s =>
                                s.status === 'RUNNING' ? { ...s, status: 'SUCCESS', durationMs: elapsedMs - 63_000 }
                                    : s.status === 'PENDING' ? { ...s, status: 'SUCCESS', durationMs: 39_000 }
                                        : s
                            ),
                        }
                    }
                    return r
                })
                return updated
            })

            setTick(t => t + 1)
        }, 8_000)

        return () => clearInterval(interval)
    }, [])

    // ── Spawn a new fake run every 45s ────────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            const repo = repos[Math.floor(Math.random() * repos.length)]
            const branches = ['main', 'feature/new-api', 'fix/memory-leak', 'chore/deps']
            const branch = branches[Math.floor(Math.random() * branches.length)]

            const newRun = {
                id: Date.now(),
                buildNumber: Math.floor(Math.random() * 50) + 300,
                repoId: repo.id,
                repoName: repo.repoName,
                workflowName: 'CI / Build & Test',
                branch,
                headSha: Math.random().toString(16).slice(2, 9),
                commitMessage: 'chore: automated dependency update',
                triggeredBy: 'schedule',
                status: 'running',
                durationMs: null,
                startedAt: new Date().toISOString(),
                stages: [
                    { name: 'Checkout', status: 'SUCCESS', durationMs: 7_000 },
                    { name: 'Build', status: 'RUNNING', durationMs: null },
                    { name: 'Test', status: 'PENDING', durationMs: null },
                    { name: 'Deploy', status: 'PENDING', durationMs: null },
                ],
            }

            setRuns(prev => [newRun, ...prev].slice(0, 30))

            setNotifications(prev => [{
                id: Date.now(),
                type: 'info',
                title: `${repo.repoName} pipeline triggered`,
                body: `Branch ${branch} — watching build…`,
                time: new Date().toISOString(),
                read: false,
                link: '/runs',
            }, ...prev].slice(0, 10))

        }, 45_000)

        return () => clearInterval(interval)
    }, [repos])

    // ── Simulated metric fluctuation ──────────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            setMetrics(prev => {
                const lastPoint = prev.failureRateTrend[prev.failureRateTrend.length - 1]
                const newRate = Math.max(0, Math.min(100,
                    lastPoint.failureRate + (Math.random() > 0.5 ? 1 : -1)))
                return {
                    ...prev,
                    failureRateTrend: [
                        ...prev.failureRateTrend.slice(1),
                        {
                            date: new Date().toISOString().split('T')[0],
                            failureRate: newRate,
                            successRate: 100 - newRate,
                        },
                    ],
                }
            })
        }, 60_000)
        return () => clearInterval(interval)
    }, [])

    // ── Actions (no-op with feedback) ─────────────────────────────────────────
    const triggerAnalysis = useCallback((repoId, runId) => {
        // Simulate analysis becoming available after a delay
        setTimeout(() => {
            setNotifications(prev => [{
                id: Date.now(),
                type: 'ai',
                title: `AI analysis ready — run #${runId}`,
                body: 'Click to view root cause and remediation steps.',
                time: new Date().toISOString(),
                read: false,
                link: '/insights',
            }, ...prev])
        }, 4_000)
    }, [])

    const markNotifRead = useCallback(id => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    }, [])

    const markAllRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }, [])

    // ── Derived ───────────────────────────────────────────────────────────────
    const unreadCount = notifications.filter(n => !n.read).length
    const liveRuns = runs.filter(r => r.status === 'running').length

    return (
        <DemoContext.Provider value={{
            isDemoMode: true,
            repos, runs, metrics, insights, notifications,
            unreadCount, liveRuns, tick,
            triggerAnalysis, markNotifRead, markAllRead,
        }}>
            {children}
        </DemoContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useDemo = () => {
    const ctx = useContext(DemoContext)
    if (!ctx) throw new Error('useDemo must be inside DemoProvider')
    return ctx
}

// Safe hook — returns null outside demo mode instead of throwing
// eslint-disable-next-line react-refresh/only-export-components
export const useDemoSafe = () => useContext(DemoContext)