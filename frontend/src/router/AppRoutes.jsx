// ═══════════════════════════════════════════════════════════════════════════════
// src/router/AppRoutes.jsx
// ═══════════════════════════════════════════════════════════════════════════════
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute, PublicRoute } from './ProtectedRoute'
import { Layout } from '@/components/layout/Layout'
import { FullPageSpinner } from '@/components/ui/Spinner'

// ── Lazy pages — each becomes its own JS chunk ─────────────────────────────
const Login = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })))
const OAuthSuccess = lazy(() => import('@/pages/OAuthSuccess'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Pipelines = lazy(() => import('@/pages/Pipelines'))
const Runs = lazy(() => import('@/pages/Runs'))
const Insights = lazy(() => import('@/pages/Insights'))
const Settings = lazy(() => import('@/pages/Settings'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function Page({ children }) {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-32">
                <FullPageSpinner />
            </div>
        }>
            <div className="animate-fade-in">{children}</div>
        </Suspense>
    )
}

export function AppRoutes() {
    return (
        <Routes>
            {/* Public */}
            <Route path="/login"
                element={<PublicRoute><Page><Login /></Page></PublicRoute>}
            />

            {/* OAuth callback — always public, handles its own redirect */}
            <Route path="/oauth-success"
                element={<Page><OAuthSuccess /></Page>}
            />

            {/* Protected shell */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Page><Dashboard /></Page>} />
                <Route path="repos" element={<Page><Pipelines /></Page>} />
                <Route path="runs" element={<Page><Runs /></Page>} />
                <Route path="insights" element={<Page><Insights /></Page>} />
                <Route path="settings" element={<Page><Settings /></Page>} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Page><NotFound /></Page>} />
        </Routes>
    )
}