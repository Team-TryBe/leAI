'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Activity,
  CheckCircle,
  XCircle,
  Zap,
  Calendar,
  BarChart3,
  Loader2,
  AlertCircle,
  Target,
  Gauge
} from 'lucide-react'
import { getAuthToken } from '@/lib/auth'

interface ProviderConfig {
  id: number
  provider_type: string
  model_name: string
  display_name?: string
  is_active: boolean
  is_default: boolean
  created_at: string
}

interface UsageLog {
  id: number
  user_email?: string
  task_type: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  estimated_cost_usd: number
  status: string
  error_message?: string
  latency_ms: number
  created_at: string
}

interface DailyStats {
  date: string
  total_calls: number
  total_tokens: number
  total_cost_usd: number
  success_count: number
  error_count: number
  avg_latency_ms: number
}

interface TaskTypeStats {
  task_type: string
  total_calls: number
  total_tokens: number
  total_cost_usd: number
  success_rate: number
  avg_latency_ms: number
}

const PROVIDER_CONFIG = {
  gemini: { label: 'Google Gemini', icon: '🔵', color: 'bg-blue-500', gradient: 'from-blue-500/10 to-blue-600/5' },
  openai: { label: 'OpenAI', icon: '🟢', color: 'bg-green-500', gradient: 'from-green-500/10 to-green-600/5' },
  claude: { label: 'Anthropic Claude', icon: '🟣', color: 'bg-purple-500', gradient: 'from-purple-500/10 to-purple-600/5' },
}

const TASK_TYPE_LABELS: { [key: string]: { label: string; icon: string; color: string } } = {
  extraction: { label: 'Job Extraction', icon: '📊', color: 'text-blue-400' },
  cv_draft: { label: 'CV Drafting', icon: '📝', color: 'text-purple-400' },
  cover_letter: { label: 'Cover Letter', icon: '✉️', color: 'text-green-400' },
  extraction_validation: { label: 'Image Validation', icon: '🖼️', color: 'text-yellow-400' },
}

export default function APIAnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const providerId = params.providerId as string

  const [provider, setProvider] = useState<ProviderConfig | null>(null)
  const [recentLogs, setRecentLogs] = useState<UsageLog[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [taskStats, setTaskStats] = useState<TaskTypeStats[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30)

  useEffect(() => {
    if (providerId) {
      fetchProviderData()
    }
  }, [providerId, timeRange])

  const fetchProviderData = async () => {
    setLoading(true)
    try {
      const token = getAuthToken()

      // Fetch provider config
      const providerResponse = await fetch(
        `http://127.0.0.1:8000/api/v1/super-admin/providers/configs/${providerId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (providerResponse.ok) {
        const data = await providerResponse.json()
        setProvider(data.data)
      }

      // Fetch recent usage logs
      const logsResponse = await fetch(
        `http://127.0.0.1:8000/api/v1/super-admin/providers/${providerId}/usage-logs?limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (logsResponse.ok) {
        const data = await logsResponse.json()
        setRecentLogs(data.data || [])
      }

      // Fetch daily stats
      const dailyResponse = await fetch(
        `http://127.0.0.1:8000/api/v1/super-admin/providers/${providerId}/daily-stats?days=${timeRange}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (dailyResponse.ok) {
        const data = await dailyResponse.json()
        setDailyStats(data.data || [])
      }

      // Fetch task type stats
      const taskResponse = await fetch(
        `http://127.0.0.1:8000/api/v1/super-admin/providers/${providerId}/task-stats?days=${timeRange}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (taskResponse.ok) {
        const data = await taskResponse.json()
        setTaskStats(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate aggregate stats
  const totalCalls = dailyStats.reduce((sum, day) => sum + day.total_calls, 0)
  const totalTokens = dailyStats.reduce((sum, day) => sum + day.total_tokens, 0)
  const totalCost = dailyStats.reduce((sum, day) => sum + day.total_cost_usd, 0)
  const successCount = dailyStats.reduce((sum, day) => sum + day.success_count, 0)
  const errorCount = dailyStats.reduce((sum, day) => sum + day.error_count, 0)
  const successRate = totalCalls > 0 ? (successCount / totalCalls) * 100 : 0
  const avgLatency = dailyStats.length > 0 
    ? dailyStats.reduce((sum, day) => sum + day.avg_latency_ms, 0) / dailyStats.length 
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin mx-auto mb-3" />
          <p className="text-brand-text-muted">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="text-center py-20">
        <p className="text-brand-text-muted">Provider not found</p>
        <Link
          href="/admin/api-keys"
          className="inline-flex items-center gap-2 mt-4 text-brand-primary hover:text-brand-primary/80"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview
        </Link>
      </div>
    )
  }

  const config = PROVIDER_CONFIG[provider.provider_type as keyof typeof PROVIDER_CONFIG] || {
    label: provider.provider_type,
    icon: '⚙️',
    color: 'bg-gray-500',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/api-keys"
            className="inline-flex items-center gap-2 text-brand-text-muted hover:text-brand-text mb-3 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Overview
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{config.icon}</span>
            <div>
              <h1 className="text-3xl font-bold text-brand-text">
                {provider.display_name || provider.model_name}
              </h1>
              <p className="text-brand-text-muted mt-1 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                {config.label} Analytics
              </p>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2 bg-brand-dark-bg border border-brand-dark-border rounded-lg p-1">
          {([7, 30, 90] as const).map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                timeRange === days
                  ? 'bg-brand-primary text-white'
                  : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid - Compact with Gradients */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className={`bg-gradient-to-br ${PROVIDER_CONFIG[provider.provider_type as keyof typeof PROVIDER_CONFIG]?.gradient || 'from-gray-500/10'} border border-brand-dark-border rounded-lg p-4 hover:border-brand-primary/50 transition`}>
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-4 h-4 text-brand-primary" />
            <p className="text-xs text-brand-text-muted uppercase font-bold tracking-wider">Calls</p>
          </div>
          <p className="text-2xl font-bold text-brand-text">{totalCalls.toLocaleString()}</p>
          <p className="text-xs text-brand-text-muted mt-1">{timeRange}d total</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-brand-dark-border rounded-lg p-4 hover:border-brand-primary/50 transition">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <p className="text-xs text-brand-text-muted uppercase font-bold tracking-wider">Tokens</p>
          </div>
          <p className="text-2xl font-bold text-brand-text">{(totalTokens / 1_000_000).toFixed(1)}M</p>
          <p className="text-xs text-brand-text-muted mt-1">
            {totalCalls > 0 ? (totalTokens / totalCalls).toFixed(0) : 0} avg
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-brand-dark-border rounded-lg p-4 hover:border-brand-primary/50 transition">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            <p className="text-xs text-brand-text-muted uppercase font-bold tracking-wider">Cost</p>
          </div>
          <p className="text-2xl font-bold text-green-400">${totalCost.toFixed(2)}</p>
          <p className="text-xs text-green-400/70 mt-1">
            ${totalCalls > 0 ? (totalCost / totalCalls).toFixed(4) : 0}/call
          </p>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-brand-dark-border rounded-lg p-4 hover:border-brand-primary/50 transition">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <p className="text-xs text-brand-text-muted uppercase font-bold tracking-wider">Success</p>
          </div>
          <p className="text-2xl font-bold text-cyan-400">{successRate.toFixed(1)}%</p>
          <p className="text-xs text-cyan-400/70 mt-1">
            {successCount} / {errorCount} errors
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-brand-dark-border rounded-lg p-4 hover:border-brand-primary/50 transition">
          <div className="flex items-center justify-between mb-2">
            <Gauge className="w-4 h-4 text-orange-400" />
            <p className="text-xs text-brand-text-muted uppercase font-bold tracking-wider">Latency</p>
          </div>
          <p className="text-2xl font-bold text-orange-400">{avgLatency.toFixed(0)}ms</p>
          <p className="text-xs text-orange-400/70 mt-1">Response time</p>
        </div>
      </div>

      {/* Task Type Breakdown - Compact Grid */}
      {taskStats.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-brand-text mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-primary" />
            Task Performance
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {taskStats.map((stat) => {
              const taskConfig = TASK_TYPE_LABELS[stat.task_type] || {
                label: stat.task_type,
                icon: '📌',
                color: 'text-gray-400',
              }
              const successColor = stat.success_rate >= 95 ? 'text-green-400' : stat.success_rate >= 80 ? 'text-yellow-400' : 'text-red-400'
              const bgColor = stat.success_rate >= 95 ? 'from-green-500/10' : stat.success_rate >= 80 ? 'from-yellow-500/10' : 'from-red-500/10'
              
              return (
                <div
                  key={stat.task_type}
                  className={`bg-gradient-to-br ${bgColor} to-brand-darker-bg border border-brand-dark-border rounded-lg p-4 hover:border-brand-primary/50 transition`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{taskConfig.icon}</span>
                      <div>
                        <p className="font-semibold text-brand-text text-sm">{taskConfig.label}</p>
                        <p className="text-xs text-brand-text-muted">{stat.total_calls.toLocaleString()} calls</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${successColor}`}>{stat.success_rate.toFixed(0)}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-brand-darker-bg/50 rounded p-2">
                      <p className="text-brand-text-muted mb-0.5">Tokens</p>
                      <p className="font-bold text-brand-text">{(stat.total_tokens / 1000).toFixed(0)}K</p>
                    </div>
                    <div className="bg-brand-darker-bg/50 rounded p-2">
                      <p className="text-brand-text-muted mb-0.5">Cost</p>
                      <p className="font-bold text-green-400">${stat.total_cost_usd.toFixed(2)}</p>
                    </div>
                    <div className="bg-brand-darker-bg/50 rounded p-2">
                      <p className="text-brand-text-muted mb-0.5">Latency</p>
                      <p className="font-bold text-orange-400">{stat.avg_latency_ms.toFixed(0)}ms</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Daily Trend Chart - Enhanced */}
      {dailyStats.length > 0 && (
        <div className="bg-brand-dark-bg border border-brand-dark-border rounded-lg p-5">
          <h2 className="text-lg font-bold text-brand-text mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-primary" />
            Daily Trend (Last 14 Days)
          </h2>
          <div className="space-y-2">
            {dailyStats.slice(-14).map((day) => {
              const maxCalls = Math.max(...dailyStats.slice(-14).map(d => d.total_calls))
              const barWidth = maxCalls > 0 ? (day.total_calls / maxCalls) * 100 : 0
              const successRate = day.total_calls > 0 ? ((day.success_count / day.total_calls) * 100) : 0
              const statusColor = successRate === 100 ? 'from-green-500/20' : successRate >= 95 ? 'from-yellow-500/20' : 'from-red-500/20'
              const config = PROVIDER_CONFIG[provider.provider_type as keyof typeof PROVIDER_CONFIG]
              
              return (
                <div key={day.date} className="flex items-center gap-2 group">
                  <p className="text-xs text-brand-text-muted w-16 font-mono">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                  </p>
                  <div className="flex-1">
                    <div className={`bg-gradient-to-r ${statusColor} ${config?.color}/20 border border-brand-dark-border rounded-lg h-9 relative overflow-hidden flex items-center transition group-hover:border-brand-primary/50`}>
                      <div
                        className={`h-full ${config?.color}/40 transition-all`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-mono pointer-events-none">
                        <span className="text-brand-text font-bold drop-shadow-sm">{day.total_calls.toLocaleString()} calls</span>
                        <span className={`${successRate === 100 ? 'text-green-400' : 'text-yellow-400'} font-bold drop-shadow-sm`}>
                          {successRate.toFixed(0)}%
                        </span>
                        <span className="text-brand-text-muted drop-shadow-sm">${day.total_cost_usd.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-12 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      {day.success_count > 0 && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
                      {day.error_count > 0 && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                    <p className="text-xs text-brand-text-muted mt-0.5">{day.avg_latency_ms}ms</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Activity Log - Compact */}
      {recentLogs.length > 0 && (
        <div className="bg-brand-dark-bg border border-brand-dark-border rounded-lg p-5">
          <h2 className="text-lg font-bold text-brand-text mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-primary" />
            Recent Activity (Last 50)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-dark-border/50">
                  <th className="text-left py-2 px-2 text-brand-text-muted font-bold text-xs uppercase tracking-wider">Time</th>
                  <th className="text-left py-2 px-2 text-brand-text-muted font-bold text-xs uppercase tracking-wider">User</th>
                  <th className="text-left py-2 px-2 text-brand-text-muted font-bold text-xs uppercase tracking-wider">Task</th>
                  <th className="text-center py-2 px-2 text-brand-text-muted font-bold text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right py-2 px-2 text-brand-text-muted font-bold text-xs uppercase tracking-wider">Tokens</th>
                  <th className="text-right py-2 px-2 text-brand-text-muted font-bold text-xs uppercase tracking-wider">Cost</th>
                  <th className="text-right py-2 px-2 text-brand-text-muted font-bold text-xs uppercase tracking-wider">Latency</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => {
                  const taskConfig = TASK_TYPE_LABELS[log.task_type] || {
                    label: log.task_type,
                    icon: '📌',
                    color: 'text-gray-400',
                  }
                  
                  return (
                    <tr key={log.id} className="border-b border-brand-dark-border/30 hover:bg-brand-darker-bg/50 transition group">
                      <td className="py-2.5 px-2 text-brand-text-muted text-xs font-mono">
                        {new Date(log.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-2 text-brand-text text-xs truncate max-w-[150px]" title={log.user_email || 'N/A'}>
                        {log.user_email || '—'}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-darker-bg rounded text-xs text-brand-text font-medium border border-brand-dark-border/50 group-hover:border-brand-primary/30">
                          <span>{taskConfig.icon}</span>
                          {taskConfig.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {log.status === 'success' ? (
                          <div title="Success">
                            <CheckCircle className="w-4 h-4 text-green-400 inline" />
                          </div>
                        ) : (
                          <div title={log.error_message || 'Error'}>
                            <XCircle className="w-4 h-4 text-red-400 inline" />
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right text-brand-text font-mono text-xs">
                        {(log.total_tokens / 1000).toFixed(1)}K
                      </td>
                      <td className="py-2.5 px-2 text-right text-green-400 font-mono text-xs">
                        ${log.estimated_cost_usd.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-orange-400 font-mono text-xs font-bold">
                        {log.latency_ms}ms
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {recentLogs.length === 0 && (
        <div className="bg-brand-dark-bg border border-dashed border-brand-dark-border rounded-lg p-12 text-center">
          <Activity className="w-12 h-12 text-brand-text-muted mx-auto mb-3 opacity-40" />
          <p className="text-brand-text font-medium">No usage data yet</p>
          <p className="text-sm text-brand-text-muted mt-1">
            This provider hasn't been used in the last {timeRange} days
          </p>
        </div>
      )}
    </div>
  )
}
