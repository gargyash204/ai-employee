import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { getMe } from '@/services/auth.service'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

function AuthLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <p className="text-muted-foreground">Loading…</p>
    </main>
  )
}

function DashboardRoute({
  authStatus,
  onLogout,
}: {
  authStatus: AuthStatus
  onLogout: () => void
}) {
  if (authStatus === 'loading') {
    return <AuthLoading />
  }

  return (
    <ProtectedRoute isAuthenticated={authStatus === 'authenticated'}>
      <DashboardPage onLogout={onLogout} />
    </ProtectedRoute>
  )
}

export default function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    let cancelled = false

    async function checkAuth() {
      try {
        await getMe()
        if (!cancelled) {
          setAuthStatus('authenticated')
        }
      } catch {
        if (!cancelled) {
          setAuthStatus('unauthenticated')
        }
      }
    }

    void checkAuth()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              authStatus === 'authenticated' ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginPage onSuccess={() => setAuthStatus('authenticated')} />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              <DashboardRoute
                authStatus={authStatus}
                onLogout={() => setAuthStatus('unauthenticated')}
              />
            }
          />
          <Route
            path="/dashboard/runtime/:runtimeId"
            element={
              <DashboardRoute
                authStatus={authStatus}
                onLogout={() => setAuthStatus('unauthenticated')}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  )
}
