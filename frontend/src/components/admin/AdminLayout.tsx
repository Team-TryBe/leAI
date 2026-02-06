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
  ChevronRight
} from 'lucide-react'
import { getAuthToken } from '@/lib/auth'

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

        if (!userData.is_admin) {
          router.push('/dashboard')
          return
        }

        setIsAdmin(true)
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
        label: 'My Account',
        href: '/admin/account',
        icon: Shield,
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
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-brand-dark-card border-r border-brand-dark-border transform transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Logo & Close Button */}
        <div className="flex items-center justify-between p-6 border-b border-brand-dark-border">
          <div className="flex items-center gap-2">
            <Shield className="text-brand-primary" size={28} />
            <div>
              <h2 className="text-xl font-display font-bold text-brand-text">Admin Panel</h2>
              <p className="text-xs text-brand-text-muted">LeAI Management</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-brand-text-muted hover:text-brand-text"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition group ${
                  isActive
                    ? 'bg-brand-primary text-white'
                    : 'text-brand-text-muted hover:bg-brand-dark-border hover:text-brand-text'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
                {isActive && <ChevronRight size={16} className="ml-auto" />}
              </Link>
            )
          })}
        </nav>

          {/* Account Navigation */}
          <nav className="p-4 space-y-1 border-t border-brand-dark-border">
            {userNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'bg-brand-primary text-white'
                      : 'text-brand-text-muted hover:bg-brand-dark-border hover:text-brand-text'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto" />}
                </Link>
              )
            })}
          </nav>
        {/* Exit Admin Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-brand-dark-border">
          <button
            onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition font-medium"
          >
            <LogOut size={20} />
              <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-brand-dark-card border-b border-brand-dark-border">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden text-brand-text-muted hover:text-brand-text"
            >
              <Menu size={24} />
            </button>
            
            <div className="flex items-center gap-2 ml-auto">
              <div className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-xs font-semibold uppercase tracking-wider">
                Admin Mode
              </div>
            </div>
          
            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="ml-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-dark-border hover:bg-brand-dark-border/80 transition text-brand-text"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-sm font-bold">
                  {userData?.full_name ? userData.full_name.charAt(0).toUpperCase() : 'A'}
                </div>
                <span className="text-sm font-medium hidden sm:inline max-w-xs truncate">{userData?.email || 'Admin'}</span>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-brand-dark-card border border-brand-dark-border rounded-lg shadow-xl z-50">
                  <div className="p-3 border-b border-brand-dark-border">
                    <p className="text-sm text-brand-text-muted">Signed in as</p>
                    <p className="text-sm font-semibold text-brand-text truncate">{userData?.email}</p>
                  </div>

                  <Link
                    href="/admin/account"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-4 py-3 text-brand-text hover:bg-brand-dark-border transition border-b border-brand-dark-border"
                  >
                    <Shield size={18} />
                    <span className="text-sm font-medium">My Account</span>
                  </Link>

                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      handleLogout()
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-brand-text hover:bg-brand-dark-border transition text-red-400 hover:text-red-300"
                  >
                    <LogOut size={18} />
                    <span className="text-sm font-medium">Sign Out</span>
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
