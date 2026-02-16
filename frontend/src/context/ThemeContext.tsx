'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type ThemeMode = 'dark' | 'light'

interface ThemeContextValue {
  theme: ThemeMode
  toggleTheme: () => void
  setTheme: (theme: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'leai-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark')

  useEffect(() => {
    const storedTheme = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    const initialTheme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark'
    setThemeState(initialTheme)
    document.documentElement.classList.remove('theme-light', 'theme-dark')
    document.documentElement.classList.add(`theme-${initialTheme}`)
  }, [])

  const setTheme = (nextTheme: ThemeMode) => {
    setThemeState(nextTheme)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextTheme)
    }
    document.documentElement.classList.remove('theme-light', 'theme-dark')
    document.documentElement.classList.add(`theme-${nextTheme}`)
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
