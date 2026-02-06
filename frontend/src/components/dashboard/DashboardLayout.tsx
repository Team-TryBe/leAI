'use client'

import { useIsAuthenticated } from '@/hooks/useIsAuthenticated'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/Sidebar'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useIsAuthenticated()
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mx-auto"></div>
          <p className="text-brand-text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Redirect is already handled by AuthContext, just show loading
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mx-auto"></div>
          <p className="text-brand-text-muted">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-brand-dark">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:ml-64">
        <div className="p-6 md:p-8 space-y-8">
          {children}
        </div>
      </main>
    </div>
  )
}
