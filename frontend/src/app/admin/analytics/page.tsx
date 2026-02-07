'use client'

import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { getAuthToken } from '@/lib/auth'
import { BarChart3, TrendingUp, Users, FileText, ShieldAlert } from 'lucide-react'

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

interface GrowthStats {
  period_days: number
  users_growth: { date: string; count: number }[]
  applications_growth: { date: string; count: number }[]
}

interface SystemStats {
  subscriptions: {
    by_status: Record<string, number>
    plan_distribution: Record<string, number>
  }
  revenue: {
    total: number
    last_30_days: number
    currency: string
  }
  payments: {
    by_status: Record<string, number>
  }
  admin_actions: {
    last_7_days: number
  }
  timestamp: string
}

interface AuditLog {
  id: number
  admin_user_id: number
  admin_email: string | null
  action: string
  target_type: string | null
  target_id: number | null
  details: Record<string, any>
  ip_address: string | null
  created_at: string
}

export default function AdminAnalyticsPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [growth, setGrowth] = useState<GrowthStats | null>(null)
  const [system, setSystem] = useState<SystemStats | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://127.0.0.1:8000'

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const token = getAuthToken()
        if (!token) return

        const headers = { Authorization: `Bearer ${token}` }

        const [overviewRes, growthRes, systemRes, logsRes] = await Promise.all([
          fetch(`${apiUrl}/api/v1/admin/stats/overview`, { headers }),
          fetch(`${apiUrl}/api/v1/admin/stats/growth?days=30`, { headers }),
          fetch(`${apiUrl}/api/v1/admin/stats/system`, { headers }),
          fetch(`${apiUrl}/api/v1/admin/audit-logs?limit=10`, { headers }),
        ])

        if (overviewRes.ok) {
          const overviewJson = await overviewRes.json()
          setOverview(overviewJson.data)
        }

        if (growthRes.ok) {
          const growthJson = await growthRes.json()
          setGrowth(growthJson.data)
        }

        if (systemRes.ok) {
          const systemJson = await systemRes.json()
          setSystem(systemJson.data)
        }

        if (logsRes.ok) {
          const logsJson = await logsRes.json()
          setAuditLogs(logsJson.data?.logs || [])
        }
      } catch (error) {
        console.error('Failed to load analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [apiUrl])

  const usersGrowthMax = useMemo(() => {
    if (!growth?.users_growth?.length) return 1
    return Math.max(...growth.users_growth.map((item) => item.count), 1)
  }, [growth])

  const appsGrowthMax = useMemo(() => {
    if (!growth?.applications_growth?.length) return 1
    return Math.max(...growth.applications_growth.map((item) => item.count), 1)
  }, [growth])

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-brand-dark via-[#1a1a3e] to-brand-dark-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-brand-text mb-2">Admin Analytics</h1>
            <p className="text-brand-text-muted">
              System-wide visibility across users, applications, subscriptions, and admin actions
            </p>
          </div>

          {loading ? (
            <div className="card-dark p-8 text-center text-brand-text-muted">Loading analytics...</div>
          ) : (
            <div className="space-y-8">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card-dark p-4">
                  <div className="flex items-center gap-2 text-brand-text-muted">
                    <Users size={18} /> Users
                  </div>
                  <div className="text-3xl font-bold text-brand-text mt-2">
                    {overview?.users.total ?? 0}
                  </div>
                  <div className="text-xs text-brand-text-muted mt-1">
                    Active: {overview?.users.active ?? 0} · New (7d): {overview?.users.new_this_week ?? 0}
                  </div>
                </div>
                <div className="card-dark p-4">
                  <div className="flex items-center gap-2 text-brand-text-muted">
                    <FileText size={18} /> Applications
                  </div>
                  <div className="text-3xl font-bold text-brand-text mt-2">
                    {overview?.applications.total ?? 0}
                  </div>
                  <div className="text-xs text-brand-text-muted mt-1">
                    Recent 24h: {overview?.applications.recent_24h ?? 0}
                  </div>
                </div>
                <div className="card-dark p-4">
                  <div className="flex items-center gap-2 text-brand-text-muted">
                    <TrendingUp size={18} /> Revenue (30d)
                  </div>
                  <div className="text-3xl font-bold text-brand-text mt-2">
                    {(system?.revenue.last_30_days ?? 0).toLocaleString()} {system?.revenue.currency || 'KES'}
                  </div>
                  <div className="text-xs text-brand-text-muted mt-1">
                    Total: {(system?.revenue.total ?? 0).toLocaleString()} {system?.revenue.currency || 'KES'}
                  </div>
                </div>
                <div className="card-dark p-4">
                  <div className="flex items-center gap-2 text-brand-text-muted">
                    <ShieldAlert size={18} /> Admin Actions (7d)
                  </div>
                  <div className="text-3xl font-bold text-brand-text mt-2">
                    {system?.admin_actions.last_7_days ?? 0}
                  </div>
                  <div className="text-xs text-brand-text-muted mt-1">
                    Accountability log enabled
                  </div>
                </div>
              </div>

              {/* Growth Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card-dark p-6">
                  <div className="flex items-center gap-2 text-brand-text mb-4">
                    <BarChart3 size={18} /> User Growth (30 days)
                  </div>
                  <div className="flex items-end gap-1 h-40">
                    {(growth?.users_growth || []).map((point) => (
                      <div key={point.date} className="flex-1">
                        <div
                          className="bg-brand-primary/60 rounded-t"
                          style={{ height: `${(point.count / usersGrowthMax) * 100}%` }}
                          title={`${point.date}: ${point.count}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card-dark p-6">
                  <div className="flex items-center gap-2 text-brand-text mb-4">
                    <BarChart3 size={18} /> Application Growth (30 days)
                  </div>
                  <div className="flex items-end gap-1 h-40">
                    {(growth?.applications_growth || []).map((point) => (
                      <div key={point.date} className="flex-1">
                        <div
                          className="bg-emerald-500/60 rounded-t"
                          style={{ height: `${(point.count / appsGrowthMax) * 100}%` }}
                          title={`${point.date}: ${point.count}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Applications & Subscription Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card-dark p-6">
                  <h3 className="text-lg font-semibold text-brand-text mb-4">Applications by Status</h3>
                  <div className="space-y-2">
                    {Object.entries(overview?.applications.by_status || {}).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between text-sm text-brand-text-muted">
                        <span className="capitalize">{status.replace('_', ' ')}</span>
                        <span className="text-brand-text font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card-dark p-6">
                  <h3 className="text-lg font-semibold text-brand-text mb-4">Subscriptions Overview</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-brand-text-muted mb-2">By Status</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(system?.subscriptions.by_status || {}).map(([status, count]) => (
                          <div key={status} className="bg-brand-dark-border rounded-lg p-3">
                            <p className="text-xs text-brand-text-muted capitalize">{status.replace('_', ' ')}</p>
                            <p className="text-lg font-semibold text-brand-text">{count}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-brand-text-muted mb-2">Plan Distribution</p>
                      <div className="space-y-2">
                        {Object.entries(system?.subscriptions.plan_distribution || {}).map(([plan, count]) => (
                          <div key={plan} className="flex items-center justify-between text-sm text-brand-text-muted">
                            <span className="uppercase">{plan}</span>
                            <span className="text-brand-text font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Action Logs */}
              <div className="card-dark p-6">
                <h3 className="text-lg font-semibold text-brand-text mb-4">Recent Admin Actions</h3>
                {auditLogs.length === 0 ? (
                  <div className="text-brand-text-muted">No admin actions logged yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-brand-text-muted border-b border-brand-dark-border">
                        <tr>
                          <th className="text-left py-2">Admin</th>
                          <th className="text-left py-2">Action</th>
                          <th className="text-left py-2">Target</th>
                          <th className="text-left py-2">When</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-dark-border">
                        {auditLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="py-2 text-brand-text">
                              {log.admin_email || `Admin #${log.admin_user_id}`}
                            </td>
                            <td className="py-2 text-brand-text-muted">{log.action}</td>
                            <td className="py-2 text-brand-text-muted">
                              {log.target_type || 'n/a'}{log.target_id ? ` #${log.target_id}` : ''}
                            </td>
                            <td className="py-2 text-brand-text-muted">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
