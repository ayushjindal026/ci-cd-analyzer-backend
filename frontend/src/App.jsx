import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { Layout } from '@/components/layout/Layout'
import { FullPageSpinner } from '@/components/ui/Spinner'

// Pages
import { Login } from '@/pages/Login'
import OAuthSuccess from '@/pages/OAuthSuccess'
import Dashboard from '@/pages/Dashboard'
import Pipelines from '@/pages/Pipelines'
import Runs from '@/pages/Runs'
import Insights from '@/pages/Insights'
import Settings from '@/pages/Settings'
import NotFound from '@/pages/NotFound'

// ── Guards ────────────────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (user) return <Navigate to="/" replace />
  return children
}

// ── Routes ────────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public — redirect to / if already authed */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      {/* OAuth callback — always public, handles its own redirect */}
      <Route path="/oauth-success" element={<OAuthSuccess />} />

      {/* Protected shell */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="repos" element={<Pipelines />} />
        <Route path="runs" element={<Runs />} />
        <Route path="insights" element={<Insights />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}