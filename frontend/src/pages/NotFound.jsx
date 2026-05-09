
// ═══════════════════════════════════════════════════════════════════════════════
// src/pages/NotFound.jsx
// ═══════════════════════════════════════════════════════════════════════════════
import { Link } from 'react-router-dom'
import { Home, Activity } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
            <div className="text-center animate-fade-in">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 mb-6">
                    <Activity size={28} className="text-white" />
                </div>
                <h1 className="text-6xl font-bold text-gray-200 dark:text-gray-800 mb-2">404</h1>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">Page not found</p>
                <p className="text-sm text-gray-400 mb-8">This route doesn't exist in PipelineIQ.</p>
                <Link to="/" className="btn-primary">
                    <Home size={15} /> Back to Dashboard
                </Link>
            </div>
        </div>
    )
}