import type { ReactNode } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { getSessionRiderId } from '../lib/session'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const sessionRiderId = getSessionRiderId()
  const params = useParams()

  if (!sessionRiderId) {
    return <Navigate to="/login" replace />
  }

  if (params.id && params.id !== sessionRiderId) {
    return <Navigate to={`/dashboard/${sessionRiderId}`} replace />
  }

  return <>{children}</>
}
