// ═══════════════════════════════════════════════════════════════════════════════
// src/router/ProtectedRoute.jsx
// ═══════════════════════════════════════════════════════════════════════════════
import { Navigate } from 'react-router-dom'
import { useAuth }  from '@/context/AuthContext'
import { FullPageSpinner } from '@/components/ui/Spinner'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!user)   return <Navigate to="/login" replace />
  return children
}

export function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (user)    return <Navigate to="/" replace />
  return children
}