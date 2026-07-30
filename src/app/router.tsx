import { Navigate, Route, Routes } from 'react-router'

import { useAuth } from '@/features/auth/context/AuthContext'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ClosuresPage } from '@/features/closures/pages/ClosuresPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { GeneratorPage } from '@/features/generator/pages/GeneratorPage'
import { LibrariesPage } from '@/features/libraries/pages/LibrariesPage'
import { LotteriesPage } from '@/features/lotteries/pages/LotteriesPage'
import {
  CheckingPage,
  LaboratoryPage,
  SettingsPage,
  SimulationsPage,
  StatisticsPage,
} from '@/features/placeholder/pages/PlaceholderPages'

export function AppRouter() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted">
        <p className="text-sm text-muted-foreground">
          Carregando...
        </p>
      </main>
    )
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/loterias" element={<LotteriesPage />} />
      <Route path="/bibliotecas" element={<LibrariesPage />} />
      <Route path="/gerador" element={<GeneratorPage />} />
      <Route path="/fechamentos" element={<ClosuresPage />} />
      <Route path="/conferencia" element={<CheckingPage />} />
      <Route path="/estatisticas" element={<StatisticsPage />} />
      <Route path="/simulacoes" element={<SimulationsPage />} />
      <Route path="/laboratorio" element={<LaboratoryPage />} />
      <Route path="/configuracoes" element={<SettingsPage />} />

      <Route
        path="/login"
        element={<Navigate to="/dashboard" replace />}
      />

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  )
}