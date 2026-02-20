'use client'

import { useEffect, useMemo, useState } from 'react'
import { getAuthToken } from '@/lib/auth'
import {
  BarChart3, TrendingUp, Users, FileText, ShieldAlert, DollarSign, Activity, CreditCard, Shield,
  RefreshCw, Calendar, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Clock, LogOut
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts'

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

type TabType = 'overview' | 'growth' | 'system' | 'audit'
type TimelineFilter = 'recent' | '7-days' | '30-days'

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [timeline, setTimeline] = useState<TimelineFilter>('30-days')
  const [auditPage, setAuditPage] = useState(1)

  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [growth, setGrowth] = useState<GrowthStats | null>(null)
  const [system, setSystem] = useState<SystemStats | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [allAuditLogs, setAllAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const ITEMS_PER_PAGE = 10
  const auditPaginationMax = Math.ceil(allAuditLogs.length / ITEMS_PER_PAGE)

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://127.0.0.1:8000'

  const fetchAnalytics = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const token = getAuthToken()
      if (!token) return

      const headers = { Authorization: `Bearer ${token}` }

      const [overviewRes, growthRes, systemRes, logsRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/admin/stats/overview`, { headers }),
        fetch(`${apiUrl}/api/v1/admin/stats/growth?days=${timeline === '30-days' ? 30 : timeline === '7-days' ? 7 : 1}`, { headers }),
        fetch(`${apiUrl}/api/v1/admin/stats/system`, { headers }),
        fetch(`${apiUrl}/api/v1/admin/audit-logs?limit=100`, { headers }),
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
        const logs = logsJson.data?.logs || []
        setAllAuditLogs(logs)
        setAuditPage(1)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [timeline])

  // Pagination for audit logs
  const displayedAuditLogs = useMemo(() => {
    const start = (auditPage - 1) * ITEMS_PER_PAGE
    return allAuditLogs.slice(start, start + ITEMS_PER_PAGE)
  }, [allAuditLogs, auditPage])

  // Transform growth data for charts
  const userGrowthData = useMemo(() => {
    return (growth?.users_growth || []).map(point => ({
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      users: point.count
    }))
  }, [growth])

  const appGrowthData = useMemo(() => {
    return (growth?.applications_growth || []).map(point => ({
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      applications: point.count
    }))
  }, [growth])

  // Application status pie chart data
  const applicationStatusData = useMemo(() => {
    if (!overview?.applications.by_status) return []
    return Object.entries(overview.applications.by_status)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count
      }))
  }, [overview])

  // Subscription distribution data
  const subscriptionStatusData = useMemo(() => {
    if (!system?.subscriptions.by_status) return []
    return Object.entries(system?.subscriptions.by_status)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: status.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        value: count
      }))
  }, [system])

  const COLORS = {
    primary: '#8b5cf6',
    success: '#10b981',
    warning: '#fbbf24',
    danger: '#ef4444',
    info: '#3b82f6',
    purple: '#a855f7',
    cyan: '#06b6d4',
    pink: '#ec4899'
  }

  const statCards = [
    {
      title: 'Total Users',
      value: overview?.users.total ?? 0,
      change: overview?.users.new_this_week ?? 0,
      changeLabel: 'new this week',
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-400',
      trend: 'up'
    },
    {
      title: 'Active Users',
      value: overview?.users.active ?? 0,
      change: overview?.users.growth_rate ?? 0,
      changeLabel: 'growth rate',
      icon: Activity,
      color: 'from-emerald-500 to-green-500',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-400',
      trend: 'up'
    },
    {
      title: 'Applications',
      value: overview?.applications.total ?? 0,
      change: overview?.applications.recent_24h ?? 0,
      changeLabel: 'in last 24h',
      icon: FileText,
      color: 'from-violet-500 to-purple-500',
      bgColor: 'bg-violet-500/10',
      textColor: 'text-violet-400',
      trend: 'up'
    },
    {
      title: 'Revenue (30d)',
      value: `${(system?.revenue.last_30_days ?? 0).toLocaleString()} ${system?.revenue.currency || 'KES'}`,
      change: system?.revenue.total ?? 0,
      changeLabel: 'total revenue',
      icon: DollarSign,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-400',
      trend: 'up',
      isRevenue: true
    }
  ]

  const tabs: Array<{ id: TabType; label: string; icon: any; description: string }> = [
    { id: 'overview', label: 'Overview', icon: Activity, description: 'Key metrics snapshot' },
    { id: 'growth', label: 'Growth Analytics', icon: TrendingUp, description: 'User & app trends' },
    { id: 'system', label: 'System Stats', icon: BarChart3, description: 'Subscriptions & revenue' },
    { id: 'audit', label: 'Admin Actions', icon: Shield, description: 'Audit log history' }
  ]

  const timelineOptions: Array<{ id: TimelineFilter; label: string; description: string }> = [
    { id: 'recent', label: 'Last 24h', description: 'Recent activity' },
    { id: '7-days', label: 'Last 7 days', description: 'Weekly trend' },
    { id: '30-days', label: 'Last 30 days', description: 'Monthly view' }
  ]

  return (
    <div className="min-h-screen bg-brand-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-display font-bold text-brand-text mb-1">Analytics Dashboard</h1>
              <p className="text-sm text-brand-text-muted">
                Comprehensive insights into platform activity and performance
              </p>
            </div>
            <button
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
              className="p-2.5 rounded-lg hover:bg-brand-dark-border transition text-brand-text-muted hover:text-brand-text disabled:opacity-50"
              title="Refresh analytics"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-brand-primary text-brand-text shadow-lg shadow-brand-primary/30'
                      : 'bg-brand-dark-border text-brand-text-muted hover:bg-brand-dark-border/80 hover:text-brand-text'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Timeline Filter (only for Growth & Audit tabs) */}
          {(activeTab === 'growth' || activeTab === 'audit') && (
            <div className="flex gap-2 flex-wrap">
              {timelineOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setTimeline(option.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    timeline === option.id
                      ? 'bg-brand-primary text-brand-text'
                      : 'bg-brand-dark-border text-brand-text-muted hover:bg-brand-dark-border/80'
                  }`}
                >
                  <Clock size={12} className="inline mr-1" />
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="card-dark p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary mb-4"></div>
            <p className="text-brand-text-muted">Loading {tabs.find(t => t.id === activeTab)?.label?.toLowerCase()}...</p>
          </div>
        ) : (
          <div>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {statCards.map((card) => {
                    const Icon = card.icon
                    return (
                      <div key={card.title} className="card-dark p-5 hover:border-brand-primary/50 transition group">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-2.5 rounded-lg ${card.bgColor} group-hover:scale-110 transition-transform`}>
                            <Icon className={card.textColor} size={22} />
                          </div>
                          {!card.isRevenue && card.trend === 'up' && (
                            <ArrowUpRight className="text-emerald-400" size={18} />
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-brand-text-muted font-medium mb-2 uppercase tracking-wider">
                            {card.title}
                          </p>
                          <h3 className="text-2xl font-bold text-brand-text mb-2">
                            {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                          </h3>
                          <p className={`text-xs ${card.textColor} flex items-center gap-1`}>
                            {!card.isRevenue && <span className="font-semibold">+{card.change}</span>}
                            {card.isRevenue && <span className="font-semibold">{(card.change as number).toLocaleString()} {system?.revenue.currency}</span>}
                            <span className="text-brand-text-muted">{card.changeLabel}</span>
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Status Distributions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Application Status */}
                  <div className="card-dark p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-brand-text">Application Status</h3>
                        <p className="text-xs text-brand-text-muted">Current distribution</p>
                      </div>
                      <div className="p-2 rounded-lg bg-violet-500/10">
                        <BarChart3 className="text-violet-400" size={18} />
                      </div>
                    </div>
                    {applicationStatusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={applicationStatusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : 0}%)`}
                            outerRadius={70}
                            fill="#8884d8"
                            dataKey="value"
                            animationDuration={800}
                          >
                            {applicationStatusData.map((entry, index) => {
                              const colors = [COLORS.warning, COLORS.success, COLORS.info, COLORS.danger]
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            })}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2d3748', borderRadius: '0.5rem', fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-40 flex items-center justify-center text-brand-text-muted text-sm">No data</div>
                    )}
                  </div>

                  {/* Subscription Status */}
                  <div className="card-dark p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-brand-text">Subscription Status</h3>
                        <p className="text-xs text-brand-text-muted">Active vs inactive</p>
                      </div>
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <CreditCard className="text-purple-400" size={18} />
                      </div>
                    </div>
                    {subscriptionStatusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={subscriptionStatusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : 0}%)`}
                            outerRadius={70}
                            fill="#8884d8"
                            dataKey="value"
                            animationDuration={800}
                          >
                            {subscriptionStatusData.map((entry, index) => {
                              const colors = [COLORS.success, COLORS.warning, COLORS.danger, COLORS.info]
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            })}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2d3748', borderRadius: '0.5rem', fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-40 flex items-center justify-center text-brand-text-muted text-sm">No data</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* GROWTH TAB */}
            {activeTab === 'growth' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* User Growth */}
                  <div className="card-dark p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-brand-text">User Growth</h3>
                        <p className="text-xs text-brand-text-muted">Last {timeline === '30-days' ? '30' : timeline === '7-days' ? '7' : '1'} days</p>
                      </div>
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Users className="text-blue-400" size={18} />
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={userGrowthData}>
                        <defs>
                          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.info} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={COLORS.info} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                        <XAxis dataKey="date" stroke="#718096" style={{ fontSize: '11px' }} tickMargin={8} />
                        <YAxis stroke="#718096" style={{ fontSize: '11px' }} tickMargin={8} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2d3748', borderRadius: '0.5rem', fontSize: '12px' }} labelStyle={{ color: '#e5e7eb' }} />
                        <Area type="monotone" dataKey="users" stroke={COLORS.info} strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" animationDuration={1000} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Application Growth */}
                  <div className="card-dark p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-brand-text">Application Growth</h3>
                        <p className="text-xs text-brand-text-muted">Last {timeline === '30-days' ? '30' : timeline === '7-days' ? '7' : '1'} days</p>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <FileText className="text-emerald-400" size={18} />
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={appGrowthData}>
                        <defs>
                          <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                        <XAxis dataKey="date" stroke="#718096" style={{ fontSize: '11px' }} tickMargin={8} />
                        <YAxis stroke="#718096" style={{ fontSize: '11px' }} tickMargin={8} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2d3748', borderRadius: '0.5rem', fontSize: '12px' }} labelStyle={{ color: '#e5e7eb' }} />
                        <Area type="monotone" dataKey="applications" stroke={COLORS.success} strokeWidth={2} fillOpacity={1} fill="url(#colorApps)" animationDuration={1000} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* SYSTEM TAB */}
            {activeTab === 'system' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Plan Distribution */}
                  <div className="card-dark p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-brand-text">Plan Distribution</h3>
                        <p className="text-xs text-brand-text-muted">Subscribers by plan</p>
                      </div>
                      <div className="p-2 rounded-lg bg-cyan-500/10">
                        <TrendingUp className="text-cyan-400" size={18} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(system?.subscriptions.plan_distribution || {}).length > 0 ? (
                        Object.entries(system?.subscriptions.plan_distribution || {}).map(([plan, count]) => {
                          const total = Object.values(system?.subscriptions.plan_distribution || {}).reduce((a, b) => a + b, 0)
                          const percentage = total > 0 ? (count / total) * 100 : 0
                          return (
                            <div key={plan} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-brand-text font-medium uppercase">{plan}</span>
                                <span className="text-brand-text-muted">{count} ({percentage.toFixed(0)}%)</span>
                              </div>
                              <div className="w-full bg-brand-dark-border rounded-full h-2 overflow-hidden">
                                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-4 text-brand-text-muted text-sm">No plan data</div>
                      )}
                    </div>
                  </div>

                  {/* Payment Status */}
                  <div className="card-dark p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-brand-text">Payment Status</h3>
                        <p className="text-xs text-brand-text-muted">Transaction overview</p>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <DollarSign className="text-amber-400" size={18} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(system?.payments.by_status || {}).length > 0 ? (
                        Object.entries(system?.payments.by_status || {}).map(([status, count]) => {
                          const statusColors: Record<string, string> = {
                            completed: 'text-emerald-400',
                            pending: 'text-yellow-400',
                            failed: 'text-red-400',
                            refunded: 'text-gray-400'
                          }
                          const statusBgs: Record<string, string> = {
                            completed: 'bg-emerald-500/10',
                            pending: 'bg-yellow-500/10',
                            failed: 'bg-red-500/10',
                            refunded: 'bg-gray-500/10'
                          }
                          return (
                            <div key={status} className={`p-3 rounded-lg ${statusBgs[status] || 'bg-brand-dark-border'} flex items-center justify-between`}>
                              <span className={`text-sm font-medium capitalize ${statusColors[status] || 'text-brand-text'}`}>
                                {status.replace('_', ' ')}
                              </span>
                              <span className="text-lg font-bold text-brand-text">{count}</span>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-4 text-brand-text-muted text-sm">No payment data</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Revenue Summary */}
                <div className="card-dark p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-brand-text">Revenue Overview</h3>
                      <p className="text-xs text-brand-text-muted">Total earnings</p>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <DollarSign className="text-amber-400" size={18} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                      <p className="text-xs text-brand-text-muted mb-1">Last 30 Days</p>
                      <p className="text-2xl font-bold text-amber-400">{(system?.revenue.last_30_days ?? 0).toLocaleString()} {system?.revenue.currency || 'KES'}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-brand-dark-border">
                      <p className="text-xs text-brand-text-muted mb-1">All Time</p>
                      <p className="text-2xl font-bold text-brand-text">{(system?.revenue.total ?? 0).toLocaleString()} {system?.revenue.currency || 'KES'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AUDIT LOG TAB */}
            {activeTab === 'audit' && (
              <div className="animate-fade-in">
                <div className="card-dark p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-base font-semibold text-brand-text">Admin Actions Log</h3>
                      <p className="text-xs text-brand-text-muted">
                        {allAuditLogs.length > 0 ? `Showing ${(auditPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(auditPage * ITEMS_PER_PAGE, allAuditLogs.length)} of ${allAuditLogs.length} actions` : 'No actions logged'}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Shield className="text-purple-400" size={18} />
                    </div>
                  </div>

                  {displayedAuditLogs.length === 0 ? (
                    <div className="text-center py-12 text-brand-text-muted text-sm">
                      <LogOut size={32} className="mx-auto mb-3 opacity-50" />
                      <p>No admin actions in this period</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-brand-text-muted border-b border-brand-dark-border">
                            <tr>
                              <th className="text-left py-3 px-3 font-semibold">Admin Email</th>
                              <th className="text-left py-3 px-3 font-semibold">Action</th>
                              <th className="text-left py-3 px-3 font-semibold">Target</th>
                              <th className="text-left py-3 px-3 font-semibold">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-dark-border">
                            {displayedAuditLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-brand-dark-border/30 transition">
                                <td className="py-3 px-3 text-brand-text font-medium">
                                  {log.admin_email || `Admin #${log.admin_user_id}`}
                                </td>
                                <td className="py-3 px-3">
                                  <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-medium">
                                    {log.action}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-brand-text-muted text-xs">
                                  <span>{log.target_type || '—'}</span>
                                  {log.target_id && <span className="text-brand-text-muted/60"> #{log.target_id}</span>}
                                </td>
                                <td className="py-3 px-3 text-brand-text-muted text-xs whitespace-nowrap">
                                  {new Date(log.created_at).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {auditPaginationMax > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-6 border-t border-brand-dark-border">
                          <p className="text-xs text-brand-text-muted">
                            Page {auditPage} of {auditPaginationMax}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setAuditPage(Math.max(1, auditPage - 1))}
                              disabled={auditPage === 1}
                              className="p-2 rounded-lg hover:bg-brand-dark-border disabled:opacity-50 disabled:cursor-not-allowed transition text-brand-text-muted hover:text-brand-text"
                            >
                              <ChevronLeft size={18} />
                            </button>

                            <div className="flex gap-1">
                              {Array.from({ length: auditPaginationMax }, (_, i) => i + 1).map((page) => (
                                <button
                                  key={page}
                                  onClick={() => setAuditPage(page)}
                                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                                    auditPage === page
                                      ? 'bg-brand-primary text-brand-text'
                                      : 'bg-brand-dark-border text-brand-text-muted hover:bg-brand-dark-border/80'
                                  }`}
                                >
                                  {page}
                                </button>
                              ))}
                            </div>

                            <button
                              onClick={() => setAuditPage(Math.min(auditPaginationMax, auditPage + 1))}
                              disabled={auditPage === auditPaginationMax}
                              className="p-2 rounded-lg hover:bg-brand-dark-border disabled:opacity-50 disabled:cursor-not-allowed transition text-brand-text-muted hover:text-brand-text"
                            >
                              <ChevronRight size={18} />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fade-in animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
