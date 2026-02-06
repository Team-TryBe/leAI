'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, BarChart3, Settings, CreditCard, Home, Menu, X, FileText, Sparkles, Send } from 'lucide-react'
import { useState } from 'react'
import { removeAuthToken } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = () => {
    removeAuthToken()
    router.push('/auth/login')
  }

  const menuItems = [
    { href: '/dashboard', icon: Home, label: 'Overview' },
    { href: '/dashboard/job-extractor', icon: Sparkles, label: 'Job Extractor' },
    { href: '/dashboard/master-cv', icon: FileText, label: 'Master CV' },
    { href: '/dashboard/applications', icon: Send, label: 'Applications' },
    { href: '/dashboard/subscription', icon: CreditCard, label: 'Subscription' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-brand-primary text-white"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-brand-dark-card border-r border-brand-dark-border z-40 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full p-6 space-y-8">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="text-2xl font-display font-bold bg-gradient-brand bg-clip-text text-transparent"
          >
            LeAI
          </Link>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive(item.href)
                    ? 'bg-brand-primary text-white'
                    : 'text-brand-text-muted hover:bg-brand-dark-border hover:text-brand-text'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User Info & Logout */}
          <div className="space-y-4 border-t border-brand-dark-border pt-4">
            <div className="px-4 py-2">
              <p className="text-xs text-brand-text-muted">Logged in as</p>
              <p className="text-sm font-semibold text-brand-text truncate">
                {typeof window !== 'undefined'
                  ? JSON.parse(localStorage.getItem('user') || '{}')?.email || 'User'
                  : 'User'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-error/20 text-brand-error hover:bg-brand-error/30 transition"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
