'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LogOut, Settings, CreditCard, Home, Menu, X, FileText, Sparkles, Send } from 'lucide-react'
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

  const coreFlowItems = [
    { href: '/dashboard', icon: Home, label: 'Overview' },
    { href: '/dashboard/master-cv', icon: FileText, label: 'Master CV' },
    { href: '/dashboard/job-extractor', icon: Sparkles, label: 'Job Extractor' },
    { href: '/dashboard/applications', icon: Send, label: 'Applications' },
  ]

  const accountItems = [
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
        {isOpen ? <X size={20} /> : <Menu size={20} />}
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
        className={`fixed left-0 top-0 h-screen w-52 bg-brand-dark border-r border-brand-dark-border z-40 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="flex flex-col h-full p-3 space-y-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/logos/white_full_logo.png"
              alt="LeAI Logo"
              width={120}
              height={40}
              priority
              className="h-8 w-auto"
            />
          </Link>

          {/* Navigation */}
          <nav className="flex-1 space-y-4">
            <div className="space-y-1">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
                Core Journey
              </p>
              {coreFlowItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition ${
                    isActive(item.href)
                      ? 'bg-brand-primary text-white'
                      : 'text-brand-text-muted hover:bg-brand-dark-border hover:text-brand-text'
                  }`}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="space-y-1">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
                Account
              </p>
              {accountItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition ${
                    isActive(item.href)
                      ? 'bg-brand-primary text-white'
                      : 'text-brand-text-muted hover:bg-brand-dark-border hover:text-brand-text'
                  }`}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          {/* User Info & Logout */}
          <div className="space-y-3 border-t border-brand-dark-border pt-3">
            <div className="px-2.5 py-2">
              <p className="text-xs text-brand-text-muted">Account</p>
              <p className="text-xs font-semibold text-brand-text truncate mt-1">
                {typeof window !== 'undefined'
                  ? JSON.parse(localStorage.getItem('user') || '{}')?.email || 'User'
                  : 'User'}
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
    </>
  )
}
