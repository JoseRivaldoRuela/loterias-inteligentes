import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/features/auth/context/AuthContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}