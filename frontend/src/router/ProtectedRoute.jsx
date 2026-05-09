import { Navigate } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'

import { FullPageSpinner } from '@/components/ui'

export default function ProtectedRoute({ children }) {

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