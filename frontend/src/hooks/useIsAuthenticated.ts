'use client'

import { useContext } from 'react'
import { AuthContext } from '@/context/AuthContext'

export function useIsAuthenticated() {
  const { isAuthenticated, isLoading } = useContext(AuthContext)
  return { isAuthenticated, isLoading }
}
