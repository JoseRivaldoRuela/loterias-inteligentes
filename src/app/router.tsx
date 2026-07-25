import { Navigate, Route, Routes } from 'react-router'

import { useAuth } from '@/features/auth/context/AuthContext'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'

export function AppRouter() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </main>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          session ? <Navigate to="/dashboard" replace /> : <LoginPage />
        }
      />

      <Route
        path="/dashboard"
        element={
          session ? <DashboardPage /> : <Navigate to="/login" replace />
        }
      />

      <Route
        path="*"
        element={
          <Navigate to={session ? '/dashboard' : '/login'} replace />
        }
      />
    </Routes>
  )
}