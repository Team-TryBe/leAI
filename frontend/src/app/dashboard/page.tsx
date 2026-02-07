'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { getAuthToken } from '@/lib/auth'
import {
  TrendingUp,
  Zap,
  CheckCircle,
  Clock,
  Send,
  AlertCircle,
  Crown,
  Calendar,
  ArrowRight,
  Sparkles,
  Target,
  Briefcase,
  X,
  Eye,
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  user: {
    id: number
    full_name: string
    email: string
  }
  applications: {
    total: number
    by_status: Record<string, number>
    this_month: number
    success_rate: number
    recent: Array<{
      id: number
      company_name: string | null
      job_title: string | null
      location: string | null
      status: string
      created_at: string
      submitted_at: string | null
      job_description?: string | null
    }>
  }
  subscription: {
    plan_id: number
    plan_type: string
    plan_name: string
    status: string
    current_period_end: string | null
    auto_renew: boolean
    max_applications: number | null
  } | null
  timestamp: string
}

const statusConfig = {
  pending: { label: 'Draft', color: 'bg-gray-500/20 text-gray-400', icon: Clock },
  extracting: { label: 'Processing', color: 'bg-blue-500/20 text-blue-400', icon: Zap },
  drafting: { label: 'Drafting', color: 'bg-purple-500/20 text-purple-400', icon: Sparkles },
  review: { label: 'Ready', color: 'bg-amber-500/20 text-amber-400', icon: AlertCircle },
  sent: { label: 'Sent', color: 'bg-green-500/20 text-green-400', icon: Send },
  waiting_response: { label: 'Waiting', color: 'bg-cyan-500/20 text-cyan-400', icon: Clock },
  interview_scheduled: { label: 'Interview', color: 'bg-emerald-500/20 text-emerald-400', icon: Target },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400', icon: AlertCircle },
  archived: { label: 'Archived', color: 'bg-gray-500/20 text-gray-500', icon: Clock },
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedJobDescription, setSelectedJobDescription] = useState<{
    company_name: string
    job_title: string
    description: string
  } | null>(null)

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://127.0.0.1:8000'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getAuthToken()
        if (!token) return

        const headers = { Authorization: `Bearer ${token}` }

        const statsRes = await fetch(`${apiUrl}/api/v1/users/dashboard/stats`, { headers })

        if (statsRes.ok) {
          const statsJson = await statsRes.json()
          setStats(statsJson.data)
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [apiUrl])

  const currentPlanType = stats?.subscription?.plan_type || 'freemium'

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Hero Welcome Section */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-primary via-brand-accent to-purple-600 p-6 text-white shadow-md">
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold">
                  Welcome, {loading ? '...' : stats?.user.full_name || 'User'}! 👋
                </h1>
                <p className="text-white/80 text-sm">
                  Your AI job assistant is ready to help.
                </p>
              </div>
              <Link
                href="/dashboard/job-extractor"
                className="flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-semibold hover:bg-white/30 transition whitespace-nowrap"
              >
                <Sparkles size={16} />
                Extract Job
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card-dark p-4 space-y-3 hover:border-brand-primary/50 transition">
            <div className="flex items-center justify-between">
              <h3 className="text-brand-text-muted text-xs font-medium">Total</h3>
              <div className="w-8 h-8 bg-brand-primary/20 rounded-lg flex items-center justify-center text-brand-primary">
                <Briefcase size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-brand-text">
              {loading ? '...' : stats?.applications.total || 0}
            </div>
            <p className="text-xs text-brand-text-muted">
              {loading ? '...' : stats?.applications.this_month || 0} this month
            </p>
          </div>

          <div className="card-dark p-4 space-y-3 hover:border-green-500/50 transition">
            <div className="flex items-center justify-between">
              <h3 className="text-brand-text-muted text-xs font-medium">Success</h3>
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center text-green-400">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-brand-text">
              {loading ? '...' : `${stats?.applications.success_rate || 0}%`}
            </div>
            <p className="text-xs text-brand-text-muted">Sent successfully</p>
          </div>

          <div className="card-dark p-4 space-y-3 hover:border-blue-500/50 transition">
            <div className="flex items-center justify-between">
              <h3 className="text-brand-text-muted text-xs font-medium">In Review</h3>
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">
                <Clock size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-brand-text">
              {loading ? '...' : stats?.applications.by_status.review || 0}
            </div>
            <p className="text-xs text-brand-text-muted">Ready to send</p>
          </div>

          <div className="card-dark p-4 space-y-3 hover:border-emerald-500/50 transition">
            <div className="flex items-center justify-between">
              <h3 className="text-brand-text-muted text-xs font-medium">Sent</h3>
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400">
                <Send size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-brand-text">
              {loading ? '...' : stats?.applications.by_status.sent || 0}
            </div>
            <p className="text-xs text-brand-text-muted">Applications</p>
          </div>
        </div>

        {/* Current Plan & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Current Plan */}
          <div className="lg:col-span-1 card-dark p-4 space-y-3">
            <div className="flex items-center gap-2 text-brand-text">
              <Crown className="text-amber-400" size={18} />
              <h2 className="text-sm font-semibold">Your Plan</h2>
            </div>

            {loading ? (
              <div className="text-xs text-brand-text-muted">Loading...</div>
            ) : stats?.subscription ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-gradient-to-br from-brand-primary/10 to-brand-accent/10 border border-brand-primary/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-brand-text">{stats.subscription.plan_name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        stats.subscription.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {stats.subscription.status}
                    </span>
                  </div>
                  <p className="text-xs text-brand-text-muted">
                    {stats.subscription.max_applications
                      ? `${stats.subscription.max_applications}/mo`
                      : 'Unlimited'}
                  </p>
                  {stats.subscription.current_period_end && (
                    <div className="flex items-center gap-1 text-xs text-brand-text-muted">
                      <Calendar size={12} />
                      {new Date(stats.subscription.current_period_end).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <Link
                  href="/dashboard/subscription"
                  className="block w-full text-center px-3 py-2 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-sm transition"
                >
                  Manage
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-gradient-to-br from-gray-500/10 to-gray-600/10 border border-gray-500/30 space-y-1">
                  <h3 className="font-semibold text-sm text-brand-text">Freemium</h3>
                  <p className="text-xs text-brand-text-muted">2 apps/month</p>
                </div>
                <Link
                  href="/dashboard/subscription"
                  className="block w-full text-center px-3 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-white text-sm transition font-medium"
                >
                  Upgrade
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-2 card-dark p-4 space-y-3">
            <h2 className="text-sm font-semibold text-brand-text">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/dashboard/job-extractor"
                className="group p-3 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 transition"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                    <Sparkles size={14} />
                  </div>
                  <h3 className="font-medium text-xs text-brand-text">Extract Job</h3>
                </div>
                <p className="text-xs text-brand-text-muted">Extract & save jobs</p>
              </Link>

              <Link
                href="/dashboard/applications"
                className="group p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <CheckCircle size={14} />
                  </div>
                  <h3 className="font-medium text-xs text-brand-text">Apps</h3>
                </div>
                <p className="text-xs text-brand-text-muted">View all</p>
              </Link>

              <Link
                href="/dashboard/profile"
                className="group p-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <Sparkles size={14} />
                  </div>
                  <h3 className="font-medium text-xs text-brand-text">Profile</h3>
                </div>
                <p className="text-xs text-brand-text-muted">Master CV</p>
              </Link>

              <Link
                href="/dashboard/settings"
                className="group p-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Send size={14} />
                  </div>
                  <h3 className="font-medium text-xs text-brand-text">Settings</h3>
                </div>
                <p className="text-xs text-brand-text-muted">Gmail, etc</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Applications */}
        {stats?.applications.recent && stats.applications.recent.length > 0 && (
          <div className="card-dark p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-text">Recent Applications</h2>
              <Link href="/dashboard/applications" className="text-xs text-brand-primary hover:underline">
                View All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-brand-dark-border">
                  <tr>
                    <th className="text-left py-2 text-brand-text-muted font-medium">Company</th>
                    <th className="text-left py-2 text-brand-text-muted font-medium">Position</th>
                    <th className="text-left py-2 text-brand-text-muted font-medium">Status</th>
                    <th className="text-left py-2 text-brand-text-muted font-medium">Date</th>
                    <th className="text-center py-2 text-brand-text-muted font-medium">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-dark-border">
                  {stats.applications.recent.slice(0, 5).map((app) => {
                    const statusInfo = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.pending
                    return (
                      <tr key={app.id} className="hover:bg-brand-dark-border/50 transition">
                        <td className="py-2 text-brand-text font-medium text-xs">{app.company_name || 'N/A'}</td>
                        <td className="py-2 text-brand-text text-xs">{app.job_title || 'N/A'}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="py-2 text-brand-text-muted text-xs">
                          {new Date(app.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2 text-center">
                          {app.job_description ? (
                            <button
                              onClick={() =>
                                setSelectedJobDescription({
                                  company_name: app.company_name || 'Unknown',
                                  job_title: app.job_title || 'Unknown',
                                  description: app.job_description || '',
                                })
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand-primary/20 hover:bg-brand-primary/30 text-brand-primary text-xs transition"
                              title="View job description"
                            >
                              <Eye size={14} />
                            </button>
                          ) : (
                            <span className="text-xs text-brand-text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Upgrade CTA (if freemium or no subscription) */}
        {(!stats?.subscription || currentPlanType === 'freemium') && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-pink-600 p-6 text-white shadow-lg">
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold">Unlock Premium</h2>
                <p className="text-sm text-white/80">
                  Unlimited apps, priority support & AI features
                </p>
              </div>
              <Link
                href="/dashboard/subscription"
                className="flex items-center gap-2 rounded-lg bg-white text-brand-dark px-4 py-2 text-sm font-semibold hover:bg-white/90 transition"
              >
                <Crown size={16} />
                View Plans
              </Link>
            </div>
          </div>
        )}

        {/* Job Description Modal */}
        {selectedJobDescription && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-brand-dark border border-brand-dark-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-start justify-between p-4 border-b border-brand-dark-border">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-brand-text">{selectedJobDescription.job_title}</h3>
                  <p className="text-xs text-brand-text-muted mt-0.5">{selectedJobDescription.company_name}</p>
                </div>
                <button
                  onClick={() => setSelectedJobDescription(null)}
                  className="text-brand-text-muted hover:text-brand-text transition p-1.5 hover:bg-brand-dark-border rounded-lg ml-2"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto flex-1 p-4">
                <div className="prose prose-invert max-w-none">
                  <div className="text-xs text-brand-text whitespace-pre-wrap leading-relaxed">
                    {selectedJobDescription.description}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-brand-dark-border p-4 flex gap-2 justify-end">
                <button
                  onClick={() => setSelectedJobDescription(null)}
                  className="px-3 py-1.5 rounded-lg bg-brand-dark-border hover:bg-brand-dark-border/80 text-brand-text text-sm transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
