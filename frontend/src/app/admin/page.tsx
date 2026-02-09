'use client'

import { useEffect, useState } from 'react'
import { Users, FileText, Activity, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, Settings, Search, Eye, PlusCircle, Receipt, Filter, RefreshCw, ChevronLeft, ChevronRight, Shield, DollarSign, LogOut, Zap } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { getAuthToken, setAuthToken } from '@/lib/auth'

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

interface SupportUser {
  id: number
  email: string
  full_name: string
  phone?: string
  role: string
  is_active: boolean
  paygo_credits: number
  created_at?: string
}

interface TransactionLog {
  id: number
  receipt_code: string | null
  phone: string
  amount: number
  status: string
  result_code: number | null
  account_reference?: string | null
  user_email: string
  created_at: string
  completed_at?: string | null
}

interface AuditLogItem {
  id: number
  admin_email?: string | null
  action: string
  target_type?: string | null
  target_id?: number | null
  details?: Record<string, any>
  created_at: string
}

type AdminZone = 'overview' | 'support' | 'finance' | 'audit'

export default function AdminOverviewPage() {
  const [activeZone, setActiveZone] = useState<AdminZone>('overview')
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Zone A: User Support
  const [supportQuery, setSupportQuery] = useState('')
  const [supportResults, setSupportResults] = useState<SupportUser[]>([])
  const [supportLoading, setSupportLoading] = useState(false)
  const [creditReasons, setCreditReasons] = useState<Record<number, string>>({})
  const [creditLoading, setCreditLoading] = useState<Record<number, boolean>>({})
  const [supportPage, setSupportPage] = useState(0)
  const supportItemsPerPage = 10

  // Zone B: Financial Oversight
  const [transactions, setTransactions] = useState<TransactionLog[]>([])
  const [orphanedTransactions, setOrphanedTransactions] = useState<TransactionLog[]>([])
  const [financeLoading, setFinanceLoading] = useState(false)
  const [showOrphaned, setShowOrphaned] = useState(false)
  const [financePage, setFinancePage] = useState(0)
  const financeItemsPerPage = 8

  // Zone C: Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditPage, setAuditPage] = useState(0)
  const auditItemsPerPage = 12

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
  }, [])

  const handleUserLookup = async () => {
    if (!supportQuery.trim()) {
      alert('Please enter an email or phone number')
      return
    }

    setSupportLoading(true)
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/admin/users/lookup?query=${encodeURIComponent(supportQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) throw new Error('User lookup failed')

      const result = await response.json()
      setSupportResults(result.data?.users || [])
      setSupportPage(0)
    } catch (err) {
      console.error('Lookup failed:', err)
      setSupportResults([])
    } finally {
      setSupportLoading(false)
    }
  }

  const handleAddCredit = async (userId: number) => {
    const reason = creditReasons[userId]?.trim()
    if (!reason) {
      alert('Please provide a reason for adding credit')
      return
    }

    setCreditLoading((prev) => ({ ...prev, [userId]: true }))
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch('http://127.0.0.1:8000/api/v1/admin/users/credit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          reason,
          amount: 1,
        }),
      })

      if (!response.ok) throw new Error('Failed to add credit')

      alert('Credit added successfully')
      handleUserLookup()
      setCreditReasons((prev) => ({ ...prev, [userId]: '' }))
    } catch (err) {
      console.error('Credit addition failed:', err)
      alert('Failed to add credit')
    } finally {
      setCreditLoading((prev) => ({ ...prev, [userId]: false }))
    }
  }

  const handleImpersonate = async (user: SupportUser) => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`http://127.0.0.1:8000/api/v1/admin/users/${user.id}/impersonate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) throw new Error('Impersonation failed')

      const result = await response.json()
      setAuthToken(result.data.token)
      window.location.href = '/dashboard'
    } catch (err) {
      console.error('Impersonation failed:', err)
      alert('Failed to enter ghost mode')
    }
  }

  const fetchTransactions = async (orphanedOnly = false) => {
    setFinanceLoading(true)
    try {
      const token = getAuthToken()
      if (!token) return

      const url = orphanedOnly
        ? 'http://127.0.0.1:8000/api/v1/admin/transactions/orphaned'
        : 'http://127.0.0.1:8000/api/v1/admin/transactions?limit=100'

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to fetch transactions')
      const result = await response.json()

      if (orphanedOnly) {
        setOrphanedTransactions(result.data.transactions || [])
      } else {
        setTransactions(result.data.transactions || [])
      }
      setFinancePage(0)
    } catch (err) {
      console.error('Transaction fetch failed:', err)
    } finally {
      setFinanceLoading(false)
    }
  }

  const fetchAuditLogs = async () => {
    setAuditLoading(true)
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch('http://127.0.0.1:8000/api/v1/admin/audit-logs?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to fetch audit logs')
      const result = await response.json()
      setAuditLogs(result.data?.logs || [])
      setAuditPage(0)
    } catch (err) {
      console.error('Audit log fetch failed:', err)
    } finally {
      setAuditLoading(false)
    }
  }

  useEffect(() => {
    if (activeZone === 'finance') {
      fetchTransactions(showOrphaned)
    } else if (activeZone === 'audit') {
      fetchAuditLogs()
    }
  }, [activeZone, showOrphaned])

  const statCards = stats ? [
    {
      title: 'Total Users',
      value: stats.users.total,
      change: `+${stats.users.new_this_week} this week`,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-400',
    },
    {
      title: 'Active Users',
      value: stats.users.active,
      change: `${stats.users.growth_rate}% growth`,
      icon: Activity,
      color: 'from-emerald-500 to-green-500',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-400',
    },
    {
      title: 'Job Applications',
      value: stats.applications.total,
      change: `${stats.applications.recent_24h} today`,
      icon: FileText,
      color: 'from-violet-500 to-purple-500',
      bgColor: 'bg-violet-500/10',
      textColor: 'text-violet-400',
    },
    {
      title: 'Sent Applications',
      value: stats.applications.by_status.sent || 0,
      change: 'Successfully sent',
      icon: TrendingUp,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10',
      textColor: 'text-orange-400',
    },
  ] : []

  // Pagination helpers
  const getPaginatedData = (data: any[], page: number, itemsPerPage: number) => {
    const start = page * itemsPerPage
    const end = start + itemsPerPage
    return data.slice(start, end)
  }

  const getTotalPages = (data: any[], itemsPerPage: number) => {
    return Math.ceil(data.length / itemsPerPage)
  }

  const currentSupportResults = getPaginatedData(supportResults, supportPage, supportItemsPerPage)
  const supportTotalPages = getTotalPages(supportResults, supportItemsPerPage)

  const currentTransactions = getPaginatedData(
    showOrphaned ? orphanedTransactions : transactions,
    financePage,
    financeItemsPerPage
  )
  const transactionTotalPages = getTotalPages(
    showOrphaned ? orphanedTransactions : transactions,
    financeItemsPerPage
  )

  const currentAuditLogs = getPaginatedData(auditLogs, auditPage, auditItemsPerPage)
  const auditTotalPages = getTotalPages(auditLogs, auditItemsPerPage)

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mx-auto"></div>
            <p className="text-brand-text-muted">Loading admin dashboard...</p>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <div className="card-dark p-6 text-center border border-brand-error/30 bg-brand-error/5">
          <AlertCircle className="mx-auto text-brand-error mb-4" size={48} />
          <p className="text-brand-error">{error}</p>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Header with Zone Selector */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-brand-text mb-1">Admin Control Center</h1>
            <p className="text-sm text-brand-text-muted">Manage users, finances, and system operations</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="p-2 rounded-lg hover:bg-brand-dark-border transition text-brand-text-muted hover:text-brand-text"
              title="Refresh"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Zone Navigation Tabs */}
        <div className="flex gap-2 border-b border-brand-dark-border overflow-x-auto">
          <button
            onClick={() => setActiveZone('overview')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 ${
              activeZone === 'overview'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-text-muted hover:text-brand-text'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={16} />
              Overview
            </div>
          </button>
          <button
            onClick={() => setActiveZone('support')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 ${
              activeZone === 'support'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-text-muted hover:text-brand-text'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={16} />
              User Support
            </div>
          </button>
          <button
            onClick={() => setActiveZone('finance')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 ${
              activeZone === 'finance'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-text-muted hover:text-brand-text'
            }`}
          >
            <div className="flex items-center gap-2">
              <DollarSign size={16} />
              Finance
            </div>
          </button>
          <button
            onClick={() => setActiveZone('audit')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 ${
              activeZone === 'audit'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-text-muted hover:text-brand-text'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield size={16} />
              Audit Logs
            </div>
          </button>
        </div>
      </div>

      {/* OVERVIEW ZONE */}
      {activeZone === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon
              return (
                <div key={card.title} className="card-dark p-4 hover:border-brand-primary/50 transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${card.bgColor}`}>
                      <Icon className={card.textColor} size={20} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-brand-text-muted font-medium mb-1 uppercase tracking-wider">{card.title}</p>
                    <h3 className="text-2xl font-bold text-brand-text mb-1">{card.value.toLocaleString()}</h3>
                    <p className={`text-xs ${card.textColor}`}>{card.change}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Application Status Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Application Status Pie Chart */}
            <div className="card-dark p-5">
              <h3 className="text-sm font-semibold text-brand-text mb-4 uppercase tracking-wide">Application Status Distribution</h3>
              <div className="flex justify-center">
                {stats?.applications.total && stats?.applications.total > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Pending', value: stats?.applications.by_status.pending || 0, fill: '#fbbf24' },
                          { name: 'Sent', value: stats?.applications.by_status.sent || 0, fill: '#10b981' },
                          { name: 'Review', value: stats?.applications.by_status.review || 0, fill: '#3b82f6' },
                          { name: 'Archived', value: stats?.applications.by_status.archived || 0, fill: '#6b7280' },
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        animationDuration={600}
                      >
                        <Cell fill="#fbbf24" />
                        <Cell fill="#10b981" />
                        <Cell fill="#3b82f6" />
                        <Cell fill="#6b7280" />
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => (value as number).toLocaleString()}
                        contentStyle={{
                          backgroundColor: '#1a1a2e',
                          border: '1px solid #2d3748',
                          borderRadius: '0.5rem',
                          color: '#e5e7eb'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-[280px] flex items-center justify-center text-brand-text-muted">
                    No application data available
                  </div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#fbbf24' }}></div>
                  <span className="text-brand-text-muted">Pending: <span className="font-bold text-brand-text">{stats?.applications.by_status.pending || 0}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                  <span className="text-brand-text-muted">Sent: <span className="font-bold text-brand-text">{stats?.applications.by_status.sent || 0}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                  <span className="text-brand-text-muted">Review: <span className="font-bold text-brand-text">{stats?.applications.by_status.review || 0}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6b7280' }}></div>
                  <span className="text-brand-text-muted">Archived: <span className="font-bold text-brand-text">{stats?.applications.by_status.archived || 0}</span></span>
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="card-dark p-5">
              <h3 className="text-sm font-semibold text-brand-text mb-4 uppercase tracking-wide">Quick Metrics</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-brand-dark-border">
                  <span className="text-xs text-brand-text-muted">Active Session</span>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-brand-dark-border">
                  <span className="text-xs text-brand-text-muted">Last 24h Applications</span>
                  <span className="text-xs font-bold text-brand-text">{stats?.applications.recent_24h || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-brand-text-muted">User Growth (7d)</span>
                  <span className="text-xs font-bold text-brand-primary">+{stats?.users.new_this_week || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* USER SUPPORT ZONE */}
      {activeZone === 'support' && (
        <div className="space-y-4">
          <div className="card-dark p-5">
            <h3 className="text-sm font-semibold text-brand-text mb-4 uppercase tracking-wide">User Lookup & Support</h3>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="flex gap-2 mb-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={16} />
                  <input
                    value={supportQuery}
                    onChange={(e) => setSupportQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleUserLookup()}
                    placeholder="Search by email or phone..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-brand-dark-border text-brand-text text-sm placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                  />
                </div>
                <button
                  onClick={handleUserLookup}
                  disabled={supportLoading}
                  className="px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-dark text-white text-sm font-medium transition disabled:opacity-50"
                >
                  {supportLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
              {supportResults.length > 0 && (
                <p className="text-xs text-brand-text-muted">Found {supportResults.length} result(s)</p>
              )}
            </div>

            {/* Results Table */}
            {supportResults.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto text-brand-text-muted/30 mb-2" size={32} />
                <p className="text-sm text-brand-text-muted">Search for a user to get started</p>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-brand-text-muted border-b border-brand-dark-border">
                      <tr>
                        <th className="text-left py-2 pl-0">User</th>
                        <th className="text-left py-2">Contact</th>
                        <th className="text-left py-2">Credits</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-right py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-dark-border">
                      {currentSupportResults.map((user) => (
                        <tr key={user.id} className="hover:bg-brand-dark-border/50">
                          <td className="py-2 pl-0">
                            <div className="text-brand-text font-medium text-xs">{user.full_name}</div>
                            <div className="text-xs text-brand-text-muted">{user.email}</div>
                          </td>
                          <td className="py-2 text-xs text-brand-text-muted">{user.phone || '—'}</td>
                          <td className="py-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand-primary/10 text-brand-primary text-xs font-bold">
                              <Zap size={12} />
                              {user.paygo_credits ?? 0}
                            </span>
                          </td>
                          <td className="py-2">
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              user.is_active
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleImpersonate(user)}
                                title="View as user"
                                className="p-1 rounded hover:bg-indigo-500/10 text-indigo-400 transition"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => handleAddCredit(user.id)}
                                disabled={creditLoading[user.id]}
                                title="Add credit"
                                className="p-1 rounded hover:bg-emerald-500/10 text-emerald-400 transition disabled:opacity-50"
                              >
                                <PlusCircle size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {supportTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-brand-dark-border">
                    <button
                      onClick={() => setSupportPage(Math.max(0, supportPage - 1))}
                      disabled={supportPage === 0}
                      className="p-1.5 rounded hover:bg-brand-dark-border disabled:opacity-30 transition"
                    >
                      <ChevronLeft size={16} className="text-brand-text-muted" />
                    </button>
                    <span className="text-xs text-brand-text-muted">
                      Page {supportPage + 1} of {supportTotalPages}
                    </span>
                    <button
                      onClick={() => setSupportPage(Math.min(supportTotalPages - 1, supportPage + 1))}
                      disabled={supportPage === supportTotalPages - 1}
                      className="p-1.5 rounded hover:bg-brand-dark-border disabled:opacity-30 transition"
                    >
                      <ChevronRight size={16} className="text-brand-text-muted" />
                    </button>
                  </div>
                )}

                {/* Credit Reason Input */}
                {currentSupportResults.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-brand-dark-border/50 border border-brand-dark-border">
                    <p className="text-xs text-brand-text-muted mb-2">To add credit, select a user and provide a reason:</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {currentSupportResults.map((user) => (
                        <input
                          key={user.id}
                          value={creditReasons[user.id] || ''}
                          onChange={(e) => setCreditReasons((prev) => ({ ...prev, [user.id]: e.target.value }))}
                          placeholder={`Reason for ${user.full_name} (e.g., "Promotion code")`}
                          className="w-full px-2 py-1.5 rounded text-xs bg-brand-dark-border text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FINANCE ZONE */}
      {activeZone === 'finance' && (
        <div className="space-y-4">
          <div className="card-dark p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-brand-text uppercase tracking-wide">M-Pesa Transactions</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowOrphaned(!showOrphaned)
                    setFinancePage(0)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    showOrphaned
                      ? 'bg-brand-error/20 text-brand-error'
                      : 'bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30'
                  }`}
                >
                  {showOrphaned ? 'Show All' : 'Orphaned Only'}
                </button>
                <button
                  onClick={() => fetchTransactions(showOrphaned)}
                  disabled={financeLoading}
                  className="p-1.5 rounded hover:bg-brand-dark-border disabled:opacity-50 transition"
                  title="Refresh"
                >
                  <RefreshCw size={16} className={`text-brand-text-muted ${financeLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {financeLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary mx-auto mb-2"></div>
                <p className="text-xs text-brand-text-muted">Loading transactions...</p>
              </div>
            ) : currentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="mx-auto text-brand-text-muted/30 mb-2" size={32} />
                <p className="text-sm text-brand-text-muted">{showOrphaned ? 'No orphaned transactions' : 'No transactions found'}</p>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-brand-text-muted border-b border-brand-dark-border">
                      <tr>
                        <th className="text-left py-2 pl-0">Receipt</th>
                        <th className="text-left py-2">Phone</th>
                        <th className="text-right py-2">Amount</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">User Email</th>
                        <th className="text-left py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-dark-border">
                      {currentTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-brand-dark-border/50">
                          <td className="py-2 pl-0 font-mono text-brand-text text-xs">{tx.receipt_code || '—'}</td>
                          <td className="py-2 text-brand-text-muted">{tx.phone}</td>
                          <td className="py-2 text-right font-bold text-brand-text">KES {tx.amount.toLocaleString()}</td>
                          <td className="py-2">
                            <span className={`inline-flex text-xs font-medium px-2 py-1 rounded ${
                              tx.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : tx.status === 'pending'
                                ? 'bg-yellow-500/10 text-yellow-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-2 text-xs text-brand-text-muted truncate max-w-xs">{tx.user_email}</td>
                          <td className="py-2 text-xs text-brand-text-muted">{new Date(tx.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {transactionTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-brand-dark-border">
                    <button
                      onClick={() => setFinancePage(Math.max(0, financePage - 1))}
                      disabled={financePage === 0}
                      className="p-1.5 rounded hover:bg-brand-dark-border disabled:opacity-30 transition"
                    >
                      <ChevronLeft size={16} className="text-brand-text-muted" />
                    </button>
                    <span className="text-xs text-brand-text-muted">
                      Page {financePage + 1} of {transactionTotalPages}
                    </span>
                    <button
                      onClick={() => setFinancePage(Math.min(transactionTotalPages - 1, financePage + 1))}
                      disabled={financePage === transactionTotalPages - 1}
                      className="p-1.5 rounded hover:bg-brand-dark-border disabled:opacity-30 transition"
                    >
                      <ChevronRight size={16} className="text-brand-text-muted" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AUDIT LOG ZONE */}
      {activeZone === 'audit' && (
        <div className="space-y-4">
          <div className="card-dark p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-brand-text uppercase tracking-wide">Admin Activity Log</h3>
              <button
                onClick={fetchAuditLogs}
                disabled={auditLoading}
                className="p-1.5 rounded hover:bg-brand-dark-border disabled:opacity-50 transition"
                title="Refresh"
              >
                <RefreshCw size={16} className={`text-brand-text-muted ${auditLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {auditLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary mx-auto mb-2"></div>
                <p className="text-xs text-brand-text-muted">Loading audit logs...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="mx-auto text-brand-text-muted/30 mb-2" size={32} />
                <p className="text-sm text-brand-text-muted">No audit logs yet</p>
              </div>
            ) : (
              <div>
                <div className="space-y-2">
                  {currentAuditLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg bg-brand-dark-border/50 border border-brand-dark-border hover:border-brand-primary/20 transition">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-brand-primary uppercase tracking-wide">
                              {log.action.replace(/_/g, ' ')}
                            </span>
                            {log.target_type && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary">
                                {log.target_type}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-brand-text-muted">
                            {log.admin_email || 'System'} • {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                        {log.target_id && (
                          <span className="text-xs font-mono bg-brand-dark-border px-2 py-1 rounded text-brand-text-muted">
                            ID: {log.target_id}
                          </span>
                        )}
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="text-xs text-brand-text-muted mt-2 space-y-1">
                          {Object.entries(log.details).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span> {String(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {auditTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-brand-dark-border">
                    <button
                      onClick={() => setAuditPage(Math.max(0, auditPage - 1))}
                      disabled={auditPage === 0}
                      className="p-1.5 rounded hover:bg-brand-dark-border disabled:opacity-30 transition"
                    >
                      <ChevronLeft size={16} className="text-brand-text-muted" />
                    </button>
                    <span className="text-xs text-brand-text-muted">
                      Page {auditPage + 1} of {auditTotalPages}
                    </span>
                    <button
                      onClick={() => setAuditPage(Math.min(auditTotalPages - 1, auditPage + 1))}
                      disabled={auditPage === auditTotalPages - 1}
                      className="p-1.5 rounded hover:bg-brand-dark-border disabled:opacity-30 transition"
                    >
                      <ChevronRight size={16} className="text-brand-text-muted" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
