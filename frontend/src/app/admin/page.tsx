'use client'

import { AdminLayout } from '@/components/admin/AdminLayout'
import { useEffect, useState } from 'react'
import { Users, FileText, Activity, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, Settings } from 'lucide-react'
import { getAuthToken } from '@/lib/auth'

interface OverviewStats {
  users: {
    total: number
    active: number
    new_this_week: number
    growth_rate: number
  }
  applications: {
    total: number
    recent_24h: number
    by_status: Record<string, number>
  }
  timestamp: string
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = getAuthToken()
        if (!token) return

        const response = await fetch('http://127.0.0.1:8000/api/v1/admin/stats/overview', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch stats')
        }

        const result = await response.json()
        setStats(result.data)
        setIsLoading(false)
      } catch (err) {
        console.error('Error fetching stats:', err)
        setError('Failed to load statistics')
        setIsLoading(false)
      }
    }

    fetchStats()
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const statCards = stats ? [
    {
      title: 'Total Users',
      value: stats.users.total,
      change: `+${stats.users.new_this_week} this week`,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-400',
    },
    {
      title: 'Active Users',
      value: stats.users.active,
      change: `${stats.users.growth_rate}% growth`,
      icon: Activity,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10',
      textColor: 'text-green-400',
    },
    {
      title: 'Applications',
      value: stats.applications.total,
      change: `${stats.applications.recent_24h} in last 24h`,
      icon: FileText,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-400',
    },
    {
      title: 'Success Rate',
      value: stats.applications.by_status.sent || 0,
      change: 'Applications sent',
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-500/10',
      textColor: 'text-orange-400',
    },
  ] : []

  const statusItems = stats ? [
    { label: 'Pending', count: stats.applications.by_status.pending || 0, icon: Clock, color: 'text-yellow-400' },
    { label: 'Sent', count: stats.applications.by_status.sent || 0, icon: CheckCircle, color: 'text-green-400' },
    { label: 'Review', count: stats.applications.by_status.review || 0, icon: AlertCircle, color: 'text-blue-400' },
    { label: 'Archived', count: stats.applications.by_status.archived || 0, icon: XCircle, color: 'text-gray-400' },
  ] : []

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mx-auto"></div>
            <p className="text-brand-text-muted">Loading statistics...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="card-dark p-6 text-center">
          <AlertCircle className="mx-auto text-brand-error mb-4" size={48} />
          <p className="text-brand-error">{error}</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-brand-text mb-2">Admin Dashboard</h1>
        <p className="text-brand-text-muted">System overview and key metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.title} className="card-dark p-6 hover:scale-105 transition-transform">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={card.textColor} size={24} />
                </div>
              </div>
              <div>
                <p className="text-brand-text-muted text-sm mb-1">{card.title}</p>
                <h3 className="text-3xl font-bold text-brand-text mb-1">{card.value.toLocaleString()}</h3>
                <p className={`text-sm ${card.textColor}`}>{card.change}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Status Breakdown */}
        <div className="card-dark p-6">
          <h3 className="text-xl font-semibold text-brand-text mb-6">Application Status</h3>
          <div className="space-y-4">
            {statusItems.map((item) => {
              const Icon = item.icon
              const total = stats?.applications.total || 1
              const percentage = ((item.count / total) * 100).toFixed(1)
              
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={item.color} size={18} />
                      <span className="text-brand-text font-medium">{item.label}</span>
                    </div>
                    <span className="text-brand-text-muted text-sm">
                      {item.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-brand-dark-border rounded-full h-2">
                    <div
                      className={`h-2 rounded-full bg-gradient-to-r ${
                        item.label === 'Pending' ? 'from-yellow-500 to-yellow-600' :
                        item.label === 'Sent' ? 'from-green-500 to-green-600' :
                        item.label === 'Review' ? 'from-blue-500 to-blue-600' :
                        'from-gray-500 to-gray-600'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card-dark p-6">
          <h3 className="text-xl font-semibold text-brand-text mb-6">Quick Actions</h3>
          <div className="space-y-3">
            <a
              href="/admin/users"
              className="block p-4 rounded-lg bg-brand-dark-border hover:bg-brand-primary/20 transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-brand-primary" />
                  <span className="text-brand-text font-medium">Manage Users</span>
                </div>
                <span className="text-brand-text-muted group-hover:text-brand-primary transition">→</span>
              </div>
            </a>
            
            <a
              href="/admin/applications"
              className="block p-4 rounded-lg bg-brand-dark-border hover:bg-brand-primary/20 transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-brand-primary" />
                  <span className="text-brand-text font-medium">View Applications</span>
                </div>
                <span className="text-brand-text-muted group-hover:text-brand-primary transition">→</span>
              </div>
            </a>
            
            <a
              href="/admin/analytics"
              className="block p-4 rounded-lg bg-brand-dark-border hover:bg-brand-primary/20 transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp size={20} className="text-brand-primary" />
                  <span className="text-brand-text font-medium">View Analytics</span>
                </div>
                <span className="text-brand-text-muted group-hover:text-brand-primary transition">→</span>
              </div>
            </a>
            
            <a
              href="/admin/settings"
              className="block p-4 rounded-lg bg-brand-dark-border hover:bg-brand-primary/20 transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="text-brand-primary" size={20} />
                  <span className="text-brand-text font-medium">System Settings</span>
                </div>
                <span className="text-brand-text-muted group-hover:text-brand-primary transition">→</span>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card-dark p-6 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-brand-text mb-1">System Status</h3>
            <p className="text-brand-text-muted text-sm">All systems operational</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 font-medium">Online</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
