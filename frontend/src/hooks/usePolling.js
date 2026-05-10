import { useEffect, useRef, useCallback } from 'react'

/**
 * Polls `fn` every `interval` ms while the browser tab is visible.
 * Automatically pauses when tab is hidden and resumes + fires immediately on tab focus.
 *
 * @param {Function} fn        Async-safe callback to run on each tick
 * @param {number}   interval  Polling interval in ms (default 30 000)
 * @param {boolean}  enabled   Set false to pause completely (default true)
 */
export function usePolling(fn, interval = 30_000, enabled = true) {
    const fnRef = useRef(fn)
    const timerRef = useRef(null)

    // Always call the latest fn without resetting the interval
    useEffect(() => { fnRef.current = fn }, [fn])

    const tick = useCallback(() => {
        if (document.visibilityState === 'visible') fnRef.current()
    }, [])

    useEffect(() => {
        if (!enabled) return

        timerRef.current = setInterval(tick, interval)

        // Resume immediately when tab becomes visible again
        const onVisibility = () => {
            if (document.visibilityState === 'visible') tick()
        }
        document.addEventListener('visibilitychange', onVisibility)

        return () => {
            clearInterval(timerRef.current)
            document.removeEventListener('visibilitychange', onVisibility)
        }
    }, [enabled, interval, tick])
}