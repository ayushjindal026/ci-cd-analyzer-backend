import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import {
  AuthProvider,
  useAuth,
} from '@/context/AuthContext'

import { ThemeProvider } from '@/context/ThemeContext'

import { Layout } from '@/components/layout/Layout'

import { FullPageSpinner } from '@/components/ui'

import { Login } from '@/pages/Login'

import { OAuthSuccess } from '@/pages/OAuthSuccess'

import Dashboard from '@/pages/Dashboard'
import Pipelines from '@/pages/Pipelines'
import Runs from '@/pages/Runs'
import Insights from '@/pages/Insights'
import Settings from '@/pages/Settings'

// ─────────────────────────────────────────────────────────────────────────────
// Protected route wrapper
// ─────────────────────────────────────────────────────────────────────────────

function ProtectedRoute({ children }) {

  const { user, loading } = useAuth()

  // Wait until auth check finishes
  if (loading) {

    return <FullPageSpinner />
  }

  // Not authenticated
  if (!user) {

    return <Navigate to="/login" replace />
  }

  // Authenticated
  return children
}

// ─────────────────────────────────────────────────────────────────────────────
// App routes
// ─────────────────────────────────────────────────────────────────────────────

function AppRoutes() {

  const { user, loading } = useAuth()

  // Initial auth loading
  if (loading) {

    return <FullPageSpinner />
  }

  return (

    <Routes>

      {/* ── Public routes ───────────────────────────────────── */}

      <Route
        path="/login"
        element={
          user
            ? <Navigate to="/" replace />
            : <Login />
        }
      />

      <Route
        path="/oauth-success"
        element={<OAuthSuccess />}
      />

      {/* ── Protected routes ───────────────────────────────── */}

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >

        <Route
          path="/"
          element={<Dashboard />}
        />

        <Route
          path="/repos"
          element={<Pipelines />}
        />

        <Route
          path="/runs"
          element={<Runs />}
        />

        <Route
          path="/insights"
          element={<Insights />}
        />

        <Route
          path="/settings"
          element={<Settings />}
        />

      </Route>

      {/* ── Fallback ───────────────────────────────────────── */}

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />

    </Routes>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Root app
// ─────────────────────────────────────────────────────────────────────────────

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