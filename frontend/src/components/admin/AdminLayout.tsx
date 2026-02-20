'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  BarChart3,
  Shield,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Key,
  Zap,
  Sun,
  Moon
} from 'lucide-react'
import { getAuthToken } from '@/lib/auth'
import { useTheme } from '@/context/ThemeContext'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const token = getAuthToken()
        if (!token) {
          router.push('/auth/login')
          return
        }

        const response = await fetch('http://127.0.0.1:8000/api/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          router.push('/auth/login')
          return
        }

        const result = await response.json()
        const userData = result.data

        const staffRoles = [
          'super_admin',
          'support_agent',
          'finance_admin',
          'content_manager',
          'compliance_officer',
        ]

        if (!userData.role || !staffRoles.includes(userData.role)) {
          router.push('/dashboard')
          return
        }

        setIsAdmin(true)
        setUserData(userData)
        setIsLoading(false)
      } catch (error) {
        console.error('Error verifying admin:', error)
        router.push('/dashboard')
      }
    }

    verifyAdmin()
  }, [router])

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = getAuthToken()
        if (!token) return

        const response = await fetch('http://127.0.0.1:8000/api/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) return

        const result = await response.json()
        setUserData(result.data)
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    if (isAdmin) {
      fetchUserData()
    }
  }, [isAdmin])

  const navItems = [
    {
      label: 'Overview',
      href: '/admin',
      icon: LayoutDashboard,
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: Users,
    },
    {
      label: 'Applications',
      href: '/admin/applications',
      icon: FileText,
    },
    {
      label: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
    },
    {
      label: 'Settings',
      href: '/admin/settings',
      icon: Settings,
    },
  ]

    const userNavItems = [
      {
        label: 'Model Testing',
        href: '/admin/model-testing',
        icon: Zap,
      },
      {
        label: 'My Account',
        href: '/admin/account',
        icon: Shield,
      },
      {
        label: 'API Keys',
        href: '/admin/api-keys',
        icon: Key,
      },
    ]

  const handleLogout = () => {
    // Clear token from cookies
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'
    router.push('/auth/login')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-dark">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mx-auto"></div>
          <p className="text-brand-text-muted">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-brand-primary text-white"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-52 bg-brand-dark border-r border-brand-dark-border z-40 transform transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full p-3 space-y-4">
          {/* Logo */}
          <Link
            href="/admin"
            onClick={() => setIsSidebarOpen(false)}
            className="text-sm font-display font-bold bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent flex items-center gap-2"
          >
            <Shield size={16} className="text-brand-primary" />
            Admin
          </Link>

          {/* Navigation */}
          <nav className="flex-1 space-y-4">
            <div className="space-y-1">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
                Management
              </p>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-brand-primary text-white'
                        : 'text-brand-text-muted hover:bg-brand-dark-border hover:text-brand-text'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>

            <div className="space-y-1">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
                Account
              </p>
              {userNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-brand-primary text-white'
                        : 'text-brand-text-muted hover:bg-brand-dark-border hover:text-brand-text'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Theme Toggle */}
          <div className="space-y-2">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
              Appearance
            </p>
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-medium border border-brand-dark-border bg-brand-dark-card text-brand-text hover:border-brand-primary/40 transition"
              aria-label="Toggle theme"
            >
              <span className="flex items-center gap-2">
                {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                {theme === 'dark' ? 'Dark mode' : 'Light mode'}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-brand-text-muted">
                Switch
              </span>
            </button>
          </div>

          {/* Admin Info & Logout */}
          <div className="space-y-3 border-t border-brand-dark-border pt-3">
            <div className="px-2.5 py-2">
              <p className="text-xs text-brand-text-muted">Admin</p>
              <p className="text-xs font-semibold text-brand-text truncate mt-1">
                {userData?.full_name || 'Administrator'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium bg-brand-error/10 text-brand-error hover:bg-brand-error/20 transition"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="md:ml-52 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-brand-dark border-b border-brand-dark-border">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-brand-text-muted hover:text-brand-text"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <div className="px-2 py-1 bg-brand-primary/20 text-brand-primary rounded text-[10px] font-semibold uppercase tracking-wider">
                Admin
              </div>
            </div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="ml-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-dark-border hover:bg-brand-dark-border/80 transition text-brand-text"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-xs font-bold">
                  {userData?.full_name ? userData.full_name.charAt(0).toUpperCase() : 'A'}
                </div>
                <span className="text-xs font-medium hidden sm:inline max-w-xs truncate">{userData?.email || 'Admin'}</span>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-brand-dark-card border border-brand-dark-border rounded-lg shadow-xl z-50">
                  <div className="p-2.5 border-b border-brand-dark-border">
                    <p className="text-xs text-brand-text-muted">Signed in as</p>
                    <p className="text-xs font-semibold text-brand-text truncate mt-1">{userData?.email}</p>
                  </div>

                  <Link
                    href="/admin/account"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-brand-text hover:bg-brand-dark-border transition border-b border-brand-dark-border"
                  >
                    <Shield size={14} />
                    <span className="text-xs font-medium">My Account</span>
                  </Link>

                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      handleLogout()
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-brand-text hover:bg-brand-dark-border transition text-red-400 hover:text-red-300"
                  >
                    <LogOut size={14} />
                    <span className="text-xs font-medium">Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Click outside to close menu */}
            {showUserMenu && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  )
}
