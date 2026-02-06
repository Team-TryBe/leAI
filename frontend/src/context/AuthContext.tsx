'use client'

import React, { ReactNode, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isTokenValid } from '@/lib/auth'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
}

export const AuthContext = React.createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/auth/login', '/auth/signup', '/pricing', '/about', '/contact']

  useEffect(() => {
    const checkAuth = () => {
      const valid = isTokenValid()
      setIsAuthenticated(valid)
      setIsLoading(false)

      // Only redirect to login if:
      // 1. User is not authenticated
      // 2. Current page is not a public route
      // 3. Current page is not already an auth page
      const isPublicRoute = publicRoutes.includes(pathname || '/')
      const isAuthPage = pathname?.startsWith('/auth')
      
      if (!valid && !isPublicRoute && !isAuthPage) {
        router.push('/auth/login')
      }
    }

    // Small delay to ensure cookies are set after login
    const timeoutId = setTimeout(checkAuth, 100)
    return () => clearTimeout(timeoutId)
  }, [pathname, router])

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
