'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  Zap, AlertCircle, ArrowRight, Loader2, Settings, BarChart3, RefreshCw, 
  ChevronLeft, ChevronRight, TrendingUp, Search, Filter, Clock, Activity,
  CheckCircle2, AlertTriangle, Target, Gauge
} from 'lucide-react'
import { getAuthToken } from '@/lib/auth'

interface ProviderConfig {
  id: number
  provider_type: string
  model_name: string
  display_name?: string
  description?: string
  is_active: boolean
  is_default: boolean
  daily_token_limit?: number
  monthly_token_limit?: number
  last_tested_at?: string
  last_test_success?: boolean
  created_at: string
}

interface ProviderStats {
  provider_type: string
  model_name: string
  total_calls: number
  total_tokens: number
  total_cost_usd: number
  success_rate: number
  avg_latency_ms: number
}

const PROVIDER_CONFIG = {
  gemini: { 
    label: 'Google Gemini', 
    icon: '🔵', 
    color: 'bg-blue-500',
    gradient: 'from-blue-500/10 to-blue-600/5',
    border: 'border-blue-500/30'
  },
  openai: { 
    label: 'OpenAI', 
    icon: '🟢', 
    color: 'bg-green-500',
    gradient: 'from-green-500/10 to-green-600/5',
    border: 'border-green-500/30'
  },
  claude: { 
    label: 'Anthropic Claude', 
    icon: '🟣', 
    color: 'bg-purple-500',
    gradient: 'from-purple-500/10 to-purple-600/5',
    border: 'border-purple-500/30'
  },
}

export default function APIKeysPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [stats, setStats] = useState<ProviderStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statsRefreshing, setStatsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'statistics'>('overview')
  const [currentPage, setCurrentPage] = useState(1)
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const itemsPerPage = 6

  useEffect(() => {
    fetchProviders()
    fetchStats()
    
    // Auto-refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchProviders = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch('http://127.0.0.1:8000/api/v1/super-admin/providers/configs', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setProviders(data.data || [])
      } else {
        setError('Failed to fetch providers')
      }
    } catch (err) {
      setError('Error loading provider data')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      setStatsRefreshing(true)
      const token = getAuthToken()
      const response = await fetch('http://127.0.0.1:8000/api/v1/super-admin/providers/usage/stats?days=30', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data.data || [])
        setCurrentPage(1)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    } finally {
      setStatsRefreshing(false)
    }
  }

  // Filter providers
  const filteredProviders = providers.filter(p => {
    const matchesSearch = 
      p.model_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.display_name?.toLowerCase().includes(searchFilter.toLowerCase())
    const matchesStatus = statusFilter === 'all' ? true : statusFilter === 'active' ? p.is_active : !p.is_active
    return matchesSearch && matchesStatus
  })

  // Filter stats
  const filteredStats = stats.filter(s => 
    s.model_name.toLowerCase().includes(searchFilter.toLowerCase())
  )

  // Pagination
  const paginatedProviders = filteredProviders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const paginatedStats = filteredStats.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  
  const totalProviderPages = Math.ceil(filteredProviders.length / itemsPerPage)
  const totalStatsPages = Math.ceil(filteredStats.length / itemsPerPage)
  const totalPages = activeTab === 'overview' ? totalProviderPages : totalStatsPages

  // Summary stats
  const summaryStats = {
    totalCalls: stats.reduce((sum, s) => sum + s.total_calls, 0),
    totalTokens: stats.reduce((sum, s) => sum + s.total_tokens, 0),
    totalCost: stats.reduce((sum, s) => sum + s.total_cost_usd, 0),
    avgSuccess: stats.length > 0 ? (stats.reduce((sum, s) => sum + s.success_rate, 0) / stats.length) : 0,
    activeProviders: providers.filter(p => p.is_active).length,
    totalProviders: providers.length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin mx-auto mb-3" />
          <p className="text-brand-text-muted">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-brand-primary/10 to-blue-500/10 border border-brand-primary/20 rounded-xl p-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brand-text flex items-center gap-3">
            <div className="p-2.5 bg-brand-primary/20 rounded-lg">
              <Zap className="w-6 h-6 text-brand-primary" />
            </div>
            Provider Dashboard
          </h1>
          <p className="text-brand-text-muted mt-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Real-time management of {summaryStats.totalProviders} configured providers
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchStats}
            disabled={statsRefreshing}
            className="px-4 py-2 bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 text-brand-primary rounded-lg text-sm font-medium inline-flex items-center gap-2 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${statsRefreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
          <Link
            href="/admin/model-testing"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2 transition"
          >
            <Zap className="w-4 h-4" />
            Test Models
          </Link>
          <Link
            href="/admin/providers"
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2 transition"
          >
            <Settings className="w-4 h-4" />
            Manage
          </Link>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-lg p-4 hover:border-emerald-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-emerald-300 font-bold uppercase tracking-wider">Active</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-brand-text">{summaryStats.activeProviders}</p>
          <p className="text-xs text-emerald-400/70 mt-1">of {summaryStats.totalProviders} total</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-4 hover:border-blue-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-blue-300 font-bold uppercase tracking-wider">Calls (30d)</p>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-brand-text">{summaryStats.totalCalls.toLocaleString()}</p>
          <p className="text-xs text-blue-400/70 mt-1">API requests</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-lg p-4 hover:border-purple-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-purple-300 font-bold uppercase tracking-wider">Tokens</p>
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-brand-text">{(summaryStats.totalTokens / 1_000_000).toFixed(1)}M</p>
          <p className="text-xs text-purple-400/70 mt-1">processed</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg p-4 hover:border-green-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-green-300 font-bold uppercase tracking-wider">Spend</p>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-400">${summaryStats.totalCost.toFixed(2)}</p>
          <p className="text-xs text-green-400/70 mt-1">last 30 days</p>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-lg p-4 hover:border-cyan-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-cyan-300 font-bold uppercase tracking-wider">Reliability</p>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-cyan-400">{summaryStats.avgSuccess.toFixed(1)}%</p>
          <p className="text-xs text-cyan-400/70 mt-1">success rate</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-brand-dark-bg border border-brand-dark-border rounded-lg p-1 w-fit">
        <button
          onClick={() => { setActiveTab('overview'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-md font-medium text-sm transition flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-brand-primary text-white'
              : 'text-brand-text-muted hover:text-brand-text'
          }`}
        >
          <Settings className="w-4 h-4" />
          Providers ({summaryStats.totalProviders})
        </button>
        <button
          onClick={() => { setActiveTab('statistics'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-md font-medium text-sm transition flex items-center gap-2 ${
            activeTab === 'statistics'
              ? 'bg-brand-primary text-white'
              : 'text-brand-text-muted hover:text-brand-text'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Statistics
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'overview' ? 'providers' : 'models'}...`}
            value={searchFilter}
            onChange={(e) => {
              setSearchFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-10 pr-4 py-2 bg-brand-dark-bg border border-brand-dark-border rounded-lg text-brand-text placeholder-brand-text-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition"
          />
        </div>
        {activeTab === 'overview' && (
          <div className="flex gap-1 bg-brand-dark-bg border border-brand-dark-border rounded-lg p-1">
            {(['all', 'active', 'inactive'] as const).map(status => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status)
                  setCurrentPage(1)
                }}
                className={`px-3 py-1.5 rounded text-xs font-medium transition capitalize ${
                  statusFilter === status
                    ? 'bg-brand-primary text-white'
                    : 'text-brand-text-muted hover:text-brand-text'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-brand-text font-medium">Error Loading Data</p>
            <p className="text-sm text-brand-text-muted mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* OVERVIEW TAB - PROVIDERS */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {filteredProviders.length === 0 ? (
            <div className="text-center py-12 bg-brand-dark-bg border border-dashed border-brand-dark-border rounded-lg">
              <Settings className="w-12 h-12 text-brand-text-muted mx-auto mb-3 opacity-40" />
              <p className="text-brand-text font-medium">{searchFilter ? 'No providers found' : 'No Providers Configured'}</p>
              {!searchFilter && (
                <>
                  <p className="text-sm text-brand-text-muted mt-1 mb-4">Get started by creating your first provider</p>
                  <Link
                    href="/admin/providers"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition"
                  >
                    <Settings className="w-4 h-4" />
                    Configure Providers
                  </Link>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedProviders.map((provider) => {
                  const config = PROVIDER_CONFIG[provider.provider_type as keyof typeof PROVIDER_CONFIG] || {
                    label: provider.provider_type,
                    icon: '⚙️',
                    gradient: 'from-gray-500/10 to-gray-600/5',
                    border: 'border-gray-500/30'
                  }
                  
                  return (
                    <div
                      key={provider.id}
                      className={`bg-gradient-to-br ${config.gradient} border ${config.border} rounded-lg p-4 hover:border-brand-primary/50 transition group`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{config.icon}</div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-brand-text truncate">
                              {provider.display_name || provider.model_name}
                            </h3>
                            <p className="text-xs text-brand-text-muted">{config.label}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                          provider.is_active 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {provider.is_active ? '● Active' : '● Inactive'}
                        </span>
                      </div>

                      <div className="space-y-2 mb-3 pb-3 border-t border-brand-dark-border/50 pt-3 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-brand-text-muted">Model</span>
                          <code className="text-brand-text bg-brand-darker-bg px-2 py-1 rounded font-mono text-xs truncate max-w-[150px]">
                            {provider.model_name}
                          </code>
                        </div>
                        {provider.last_tested_at && (
                          <div className="flex justify-between items-center">
                            <span className="text-brand-text-muted">Status</span>
                            <span className={`font-semibold flex items-center gap-1 ${provider.last_test_success ? 'text-green-400' : 'text-yellow-400'}`}>
                              {provider.last_test_success ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" /> Valid
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3 h-3" /> Needs Test
                                </>
                              )}
                            </span>
                          </div>
                        )}
                        {provider.daily_token_limit && (
                          <div className="flex justify-between items-center">
                            <span className="text-brand-text-muted">Limit</span>
                            <span className="text-brand-text font-medium">{(provider.daily_token_limit / 1000).toFixed(0)}K/day</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Link
                          href={`/admin/api-analytics/${provider.id}`}
                          className="flex-1 text-center px-3 py-2 bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 text-brand-primary rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          Analytics
                        </Link>
                        <Link
                          href="/admin/providers"
                          className="px-3 py-2 bg-brand-darker-bg hover:bg-brand-darker-bg/70 text-brand-text-muted hover:text-brand-text rounded-lg text-xs font-medium inline-flex items-center gap-1 transition"
                        >
                          <Settings className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-brand-dark-border">
                  <div className="text-sm text-brand-text-muted">
                    Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredProviders.length)} of {filteredProviders.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-2 hover:bg-brand-darker-bg text-brand-text-muted hover:text-brand-text rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded text-sm font-medium transition ${
                            currentPage === page
                              ? 'bg-brand-primary text-white'
                              : 'hover:bg-brand-darker-bg text-brand-text-muted hover:text-brand-text'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 hover:bg-brand-darker-bg text-brand-text-muted hover:text-brand-text rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* STATISTICS TAB - MODELS */}
      {activeTab === 'statistics' && (
        <div className="space-y-4">
          {filteredStats.length === 0 ? (
            <div className="text-center py-12 bg-brand-dark-bg border border-dashed border-brand-dark-border rounded-lg">
              <BarChart3 className="w-12 h-12 text-brand-text-muted mx-auto mb-3 opacity-40" />
              <p className="text-brand-text font-medium">{searchFilter ? 'No models found' : 'No Usage Data'}</p>
              <p className="text-sm text-brand-text-muted mt-1">Usage statistics will appear once providers are used</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedStats.map((stat) => {
                  const config = PROVIDER_CONFIG[stat.provider_type as keyof typeof PROVIDER_CONFIG] || {
                    label: stat.provider_type,
                    icon: '⚙️',
                    gradient: 'from-gray-500/10 to-gray-600/5',
                    border: 'border-gray-500/30'
                  }
                  
                  const matchingProvider = providers.find(
                    p => p.provider_type === stat.provider_type && p.model_name === stat.model_name
                  )

                  const statusColor = stat.success_rate >= 95 ? 'green' : stat.success_rate >= 80 ? 'yellow' : 'red'
                  const statusIcons = { green: '✓', yellow: '⚠', red: '✗' }
                  
                  return (
                    <div
                      key={`${stat.provider_type}-${stat.model_name}`}
                      className={`bg-gradient-to-br ${config.gradient} border ${config.border} rounded-lg p-4 hover:border-brand-primary/50 transition group`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xl flex-shrink-0">{config.icon}</span>
                          <div className="min-w-0">
                            <p className="font-semibold text-brand-text text-sm">{config.label}</p>
                            <code className="text-xs text-brand-text-muted bg-brand-darker-bg px-1.5 py-0.5 rounded font-mono truncate block mt-0.5">
                              {stat.model_name}
                            </code>
                          </div>
                        </div>
                        <span className={`text-lg font-bold flex-shrink-0 ${
                          statusColor === 'green' ? 'text-green-400' : statusColor === 'yellow' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {statusIcons[statusColor]}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-brand-darker-bg/50 rounded p-2.5">
                          <p className="text-xs text-brand-text-muted mb-0.5 font-medium">Calls</p>
                          <p className="text-sm font-bold text-brand-text">{stat.total_calls.toLocaleString()}</p>
                        </div>
                        <div className="bg-brand-darker-bg/50 rounded p-2.5">
                          <p className="text-xs text-brand-text-muted mb-0.5 font-medium">Tokens</p>
                          <p className="text-sm font-bold text-brand-text">{(stat.total_tokens / 1000).toFixed(0)}K</p>
                        </div>
                        <div className="bg-green-500/10 rounded p-2.5 border border-green-500/20">
                          <p className="text-xs text-green-300 mb-0.5 font-medium">Cost</p>
                          <p className="text-sm font-bold text-green-400">${stat.total_cost_usd.toFixed(2)}</p>
                        </div>
                        <div className="bg-orange-500/10 rounded p-2.5 border border-orange-500/20">
                          <p className="text-xs text-orange-300 mb-0.5 font-medium">Latency</p>
                          <p className="text-sm font-bold text-orange-400">{stat.avg_latency_ms}ms</p>
                        </div>
                      </div>

                      <div className="mb-3 pb-3 border-t border-brand-dark-border/50 pt-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-brand-text-muted">Success Rate</span>
                          <span className={`font-bold ${
                            statusColor === 'green' ? 'text-green-400' : statusColor === 'yellow' ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {stat.success_rate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-brand-darker-bg rounded-full h-1.5 mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              statusColor === 'green' ? 'bg-green-500' : statusColor === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${stat.success_rate}%` }}
                          />
                        </div>
                      </div>

                      {matchingProvider && (
                        <Link
                          href={`/admin/api-analytics/${matchingProvider.id}`}
                          className="w-full text-center px-3 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition group-hover:scale-[1.02]"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          View Details
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-brand-dark-border">
                  <div className="text-sm text-brand-text-muted">
                    Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredStats.length)} of {filteredStats.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-2 hover:bg-brand-darker-bg text-brand-text-muted hover:text-brand-text rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded text-sm font-medium transition ${
                            currentPage === page
                              ? 'bg-brand-primary text-white'
                              : 'hover:bg-brand-darker-bg text-brand-text-muted hover:text-brand-text'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 hover:bg-brand-darker-bg text-brand-text-muted hover:text-brand-text rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
