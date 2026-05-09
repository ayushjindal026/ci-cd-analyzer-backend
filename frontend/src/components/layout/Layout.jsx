// ─── src/components/layout/Layout.jsx ────────────────────────────────────────
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES = {
    '/': 'Dashboard',
    '/repos': 'Repositories',
    '/runs': 'Pipeline Runs',
    '/insights': 'AI Insights',
    '/settings': 'Settings',
}

export function Layout() {
    const [collapsed, setCollapsed] = useState(false)
    const { pathname } = useLocation()
    const title = PAGE_TITLES[pathname] ?? 'PipelineIQ'

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
            <div className="relative flex-shrink-0">
                <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
            </div>
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <TopBar title={title} />
                <main className="flex-1 overflow-y-auto p-6 space-y-6 animate-fade-in">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}