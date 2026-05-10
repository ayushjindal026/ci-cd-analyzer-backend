import { Component } from 'react'
import { Activity, RefreshCw } from 'lucide-react'

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, info: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, info) {
        this.setState({ info })
        // In production you'd send this to Sentry / your error service
        console.error('[ErrorBoundary]', error, info)
    }

    render() {
        if (!this.state.hasError) return this.props.children

        const { error, info } = this.state
        const isDev = import.meta.env.DEV

        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
                <div className="max-w-lg w-full text-center animate-fade-in">

                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600/20 border border-red-600/30 mb-6">
                        <Activity size={28} className="text-red-400" />
                    </div>

                    <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
                    <p className="text-gray-400 text-sm mb-6">
                        PipelineIQ encountered an unexpected error. Your data is safe.
                    </p>

                    {isDev && error && (
                        <details className="text-left mb-6 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                            <summary className="px-4 py-3 text-xs font-semibold text-red-400 cursor-pointer hover:bg-gray-800 transition-colors">
                                Error details (dev only)
                            </summary>
                            <pre className="px-4 py-3 text-xs text-red-300 overflow-auto max-h-48 font-mono leading-relaxed">
                                {error.toString()}
                                {'\n\n'}
                                {info?.componentStack}
                            </pre>
                        </details>
                    )}

                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
                        >
                            <RefreshCw size={15} /> Reload app
                        </button>
                        <button
                            onClick={() => { this.setState({ hasError: false, error: null, info: null }); window.location.href = '/' }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-200 text-sm font-medium hover:bg-gray-700 transition-colors"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        )
    }
}