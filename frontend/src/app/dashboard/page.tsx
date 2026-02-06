'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { TrendingUp, Zap, CheckCircle, Clock } from 'lucide-react'

export default function DashboardPage() {
  const stats = [
    { label: 'Total Applications', value: '12', icon: Zap, color: 'text-brand-primary' },
    { label: 'Completed', value: '8', icon: CheckCircle, color: 'text-brand-success' },
    { label: 'In Progress', value: '3', icon: Clock, color: 'text-brand-accent' },
    { label: 'Success Rate', value: '95%', icon: TrendingUp, color: 'text-brand-primary' },
  ]

  const recentApplications = [
    { id: 1, company: 'Tech Corp', position: 'Software Engineer', status: 'submitted', date: '2 days ago' },
    { id: 2, company: 'Design Studio', position: 'UI/UX Designer', status: 'in-progress', date: '1 day ago' },
    { id: 3, company: 'Startup Inc', position: 'Product Manager', status: 'completed', date: 'Today' },
  ]

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-display font-bold text-brand-text">Welcome back! 👋</h1>
        <p className="text-brand-text-muted">Here's your job application overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="card-dark p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-brand-text-muted text-sm font-medium">{stat.label}</h3>
                <div className={`w-10 h-10 bg-brand-primary/20 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <Icon size={20} />
                </div>
              </div>
              <div className="text-3xl font-bold text-brand-text">{stat.value}</div>
            </div>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applications Over Time */}
        <div className="lg:col-span-2 card-dark p-6 space-y-6">
          <h2 className="text-xl font-semibold text-brand-text">Applications This Month</h2>
          <div className="h-64 bg-brand-dark/50 rounded-lg flex items-center justify-center border border-brand-dark-border">
            <div className="text-center space-y-2">
              <p className="text-brand-text-muted">📊</p>
              <p className="text-sm text-brand-text-muted">Chart visualization coming soon</p>
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="card-dark p-6 space-y-6">
          <h2 className="text-xl font-semibold text-brand-text">Status Breakdown</h2>
          <div className="space-y-4">
            {[
              { label: 'Submitted', count: 8, color: 'bg-brand-primary' },
              { label: 'In Progress', count: 3, color: 'bg-brand-accent' },
              { label: 'Draft', count: 1, color: 'bg-brand-text-muted' },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-brand-text-muted">{item.label}</span>
                  <span className="text-sm font-semibold text-brand-text">{item.count}</span>
                </div>
                <div className="w-full h-2 bg-brand-dark-border rounded-full overflow-hidden">
                  <div className={`h-full ${item.color}`} style={{ width: `${(item.count / 12) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="card-dark p-6 space-y-6">
        <h2 className="text-xl font-semibold text-brand-text">Recent Applications</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-brand-dark-border">
              <tr>
                <th className="text-left py-3 text-brand-text-muted font-medium">Company</th>
                <th className="text-left py-3 text-brand-text-muted font-medium">Position</th>
                <th className="text-left py-3 text-brand-text-muted font-medium">Status</th>
                <th className="text-left py-3 text-brand-text-muted font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-dark-border">
              {recentApplications.map((app) => (
                <tr key={app.id} className="hover:bg-brand-dark-border/50 transition">
                  <td className="py-3 text-brand-text font-medium">{app.company}</td>
                  <td className="py-3 text-brand-text">{app.position}</td>
                  <td className="py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        app.status === 'submitted'
                          ? 'bg-brand-success/20 text-brand-success'
                          : app.status === 'in-progress'
                          ? 'bg-brand-accent/20 text-brand-accent'
                          : 'bg-brand-primary/20 text-brand-primary'
                      }`}
                    >
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 text-brand-text-muted">{app.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
