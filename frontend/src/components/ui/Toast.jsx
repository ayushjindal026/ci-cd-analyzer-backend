import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

// ── Context ───────────────────────────────────────────────────────────────────
const ToastCtx = createContext(null)

const ICONS = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
}
const STYLES = {
    success: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50  dark:bg-emerald-900/30  text-emerald-800 dark:text-emerald-200',
    error: 'border-red-200    dark:border-red-800    bg-red-50     dark:bg-red-900/30     text-red-800    dark:text-red-200',
    warning: 'border-amber-200  dark:border-amber-800  bg-amber-50   dark:bg-amber-900/30   text-amber-800  dark:text-amber-200',
    info: 'border-brand-200  dark:border-brand-800  bg-brand-50   dark:bg-brand-900/30   text-brand-800  dark:text-brand-200',
}
const ICON_CLS = {
    success: 'text-emerald-500',
    error: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-brand-500',
}

// ── Single toast ──────────────────────────────────────────────────────────────
function Toast({ id, type = 'info', title, message, onDismiss }) {
    const Icon = ICONS[type] ?? Info
    return (
        <div className={`
      flex items-start gap-3 p-4 rounded-xl border shadow-lg
      w-80 max-w-[calc(100vw-2rem)] pointer-events-auto
      animate-slide-up
      ${STYLES[type] ?? STYLES.info}
    `}>
            <Icon size={17} className={`flex-shrink-0 mt-0.5 ${ICON_CLS[type]}`} />
            <div className="flex-1 min-w-0">
                {title && <p className="text-sm font-semibold leading-tight">{title}</p>}
                {message && <p className={`text-xs leading-relaxed ${title ? 'mt-0.5 opacity-80' : ''}`}>{message}</p>}
            </div>
            <button
                onClick={() => onDismiss(id)}
                className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
            >
                <X size={14} />
            </button>
        </div>
    )
}

// ── Provider ──────────────────────────────────────────────────────────────────
let _uid = 0

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const timers = useRef({})

    const dismiss = useCallback(id => {
        clearTimeout(timers.current[id])
        setToasts(t => t.filter(x => x.id !== id))
    }, [])

    const toast = useCallback((type, title, message, duration = 4000) => {
        const id = ++_uid
        setToasts(t => [...t, { id, type, title, message }])
        if (duration > 0) {
            timers.current[id] = setTimeout(() => dismiss(id), duration)
        }
        return id
    }, [dismiss])

    // Convenience methods
    toast.success = (title, msg, dur) => toast('success', title, msg, dur)
    toast.error = (title, msg, dur) => toast('error', title, msg, dur ?? 6000)
    toast.warning = (title, msg, dur) => toast('warning', title, msg, dur)
    toast.info = (title, msg, dur) => toast('info', title, msg, dur)

    return (
        <ToastCtx.Provider value={{ toast, dismiss }}>
            {children}
            {/* Portal-style fixed container */}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <Toast key={t.id} {...t} onDismiss={dismiss} />
                ))}
            </div>
        </ToastCtx.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
    const ctx = useContext(ToastCtx)
    if (!ctx) throw new Error('useToast must be inside ToastProvider')
    return ctx
}