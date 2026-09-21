import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, PublicRoute } from './ProtectedRoute'
import { Layout } from '@/components/layout/Layout'
import { FullPageSpinner } from '@/components/ui/Spinner'
import { DemoProvider } from '@/demo/DemoContext'

// ── Lazy pages ────────────────────────────────────────────────────────────────
const Login = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })))
const OAuthSuccess = lazy(() => import('@/pages/OAuthSuccess'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Pipelines = lazy(() => import('@/pages/Pipelines'))
const RepositoryDetails = lazy(() => import('@/pages/RepositoryDetails'))
const Runs = lazy(() => import('@/pages/Runs'))
const Insights = lazy(() => import('@/pages/Insights'))
const Settings = lazy(() => import('@/pages/Settings'))
const NotFound = lazy(() => import('@/pages/NotFound'))

// ── Demo pages ────────────────────────────────────────────────────────────────
const DemoLayout = lazy(() => import('@/pages/Demo/DemoLayout').then(m => ({ default: m.DemoLayout })))
const DemoDashboard = lazy(() => import('@/pages/Demo/DemoDashboard').then(m => ({ default: m.DemoDashboard })))
const DemoRepos = lazy(() => import('@/pages/Demo/DemoRepos').then(m => ({ default: m.DemoRepos })))
const DemoRuns = lazy(() => import('@/pages/Demo/DemoRuns').then(m => ({ default: m.DemoRuns })))
const DemoInsights = lazy(() => import('@/pages/Demo/DemoInsights').then(m => ({ default: m.DemoInsights })))

// ── Suspense wrapper ──────────────────────────────────────────────────────────
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

// ═════════════════════════════════════════════════════════════════════════════
export function AppRoutes() {
    return (
        <Routes>

            {/* ── Public ─────────────────────────────────────────────────────────── */}
            <Route path="/login"
                element={<PublicRoute><Page><Login /></Page></PublicRoute>}
            />

            {/* OAuth callback — always public, handles its own redirect */}
            <Route path="/oauth-success"
                element={<Page><OAuthSuccess /></Page>}
            />

            {/* ── Demo — fully public, no auth needed ────────────────────────────── */}
            <Route
                element={
                    <Page>
                        <DemoProvider>
                            <DemoLayout />
                        </DemoProvider>
                    </Page>
                }
            >
                <Route path="/demo" element={<Page><DemoDashboard /></Page>} />
                <Route path="/demo/repos" element={<Page><DemoRepos /></Page>} />
                <Route path="/demo/runs" element={<Page><DemoRuns /></Page>} />
                <Route path="/demo/insights" element={<Page><DemoInsights /></Page>} />
            </Route>

            {/* ── Protected shell ────────────────────────────────────────────────── */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Page><Dashboard /></Page>} />
                <Route path="repos" element={<Page><Pipelines /></Page>} />
                <Route path="repos/:id" element={<Page><RepositoryDetails /></Page>} />
                <Route path="runs" element={<Page><Runs /></Page>} />
                <Route path="insights" element={<Page><Insights /></Page>} />
                <Route path="settings" element={<Page><Settings /></Page>} />
            </Route>

            {/* ── 404 ────────────────────────────────────────────────────────────── */}
            <Route path="*" element={<Page><NotFound /></Page>} />

        </Routes>
    )
}