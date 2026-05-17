// ═══════════════════════════════════════════════════════════════════════════════
// src/pages/Demo/DemoBadge.jsx — "Sample Data" chip shown across all demo pages
// ═══════════════════════════════════════════════════════════════════════════════
import { FlaskConical } from 'lucide-react'
import { Link } from 'react-router-dom'

export function DemoBadge() {
    return (
        <div className="flex items-center justify-between flex-wrap gap-3
                    px-4 py-3 rounded-xl
                    bg-amber-50 dark:bg-amber-900/20
                    border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2.5">
                <FlaskConical size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                        Demo Workspace — Sample Data
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                        All data is simulated. Live updates are faked. Nothing touches the network.
                    </p>
                </div>
            </div>
            <Link
                to="/login"
                className="btn-primary btn-sm whitespace-nowrap flex-shrink-0"
            >
                Connect real repos →
            </Link>
        </div>
    )
}