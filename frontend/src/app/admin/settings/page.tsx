'use client'

import { AdminLayout } from '@/components/admin/AdminLayout'
import { useEffect, useState } from 'react'
import { Settings, Database, Shield, Bell, Users, Zap, Server, Check, AlertCircle } from 'lucide-react'
import { getAuthToken } from '@/lib/auth'

interface SystemSettings {
  maintenance_mode: boolean
  feature_flags: {
    ai_assistant: boolean
    job_matching: boolean
    applications: boolean
    analytics: boolean
  }
  max_users: number
  max_applications_per_user: number
  api_rate_limit: number
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    maintenance_mode: false,
    feature_flags: {
      ai_assistant: true,
      job_matching: true,
      applications: true,
      analytics: true,
    },
    max_users: 10000,
    max_applications_per_user: 100,
    api_rate_limit: 1000,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [notificationSettings, setNotificationSettings] = useState({
    email_new_users: true,
    email_suspicious_activity: true,
    email_system_errors: true,
    slack_alerts: false,
  })

  useEffect(() => {
    // Simulate loading settings from API
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }, [])

  const handleFeatureFlagChange = (key: string, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      feature_flags: {
        ...prev.feature_flags,
        [key]: value,
      },
    }))
    setHasChanges(true)
  }

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
    setHasChanges(true)
  }

    const handleMaintenanceModeChange = (value: boolean) => {
      setSettings((prev) => ({
        ...prev,
        maintenance_mode: value,
      }))
      setHasChanges(true)
    }

    const handleMaxUsersChange = (value: number) => {
      setSettings((prev) => ({
        ...prev,
        max_users: value,
      }))
      setHasChanges(true)
    }

    const handleMaxApplicationsChange = (value: number) => {
      setSettings((prev) => ({
        ...prev,
        max_applications_per_user: value,
      }))
      setHasChanges(true)
    }

    const handleApiRateLimitChange = (value: number) => {
      setSettings((prev) => ({
        ...prev,
        api_rate_limit: value,
      }))
      setHasChanges(true)
    }
  const handleSaveSettings = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch('http://127.0.0.1:8000/api/v1/admin/settings/system', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) throw new Error('Failed to save settings')

      setHasChanges(false)
      alert('Settings saved successfully')
    } catch (err) {
      console.error('Error saving settings:', err)
      alert('Failed to save settings')
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mx-auto"></div>
            <p className="text-brand-text-muted">Loading settings...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold text-brand-text mb-2">System Settings</h1>
          <p className="text-brand-text-muted">Manage platform configuration and preferences</p>
        </div>

        {hasChanges && (
          <button
            onClick={handleSaveSettings}
            className="px-8 py-3 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-semibold hover:opacity-90 transition shadow-lg"
          >
            Save Changes
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-brand-dark-border overflow-x-auto">
        {[
          { id: 'general', label: 'General', icon: Settings },
          { id: 'features', label: 'Features', icon: Zap },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'limits', label: 'Limits & Quotas', icon: Server },
          { id: 'security', label: 'Security', icon: Shield },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-6 py-3 font-medium transition-all flex items-center gap-2 whitespace-nowrap border-b-2 ${
              activeTab === id
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-text-muted hover:text-brand-text'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="card-dark p-8 space-y-6">
              <div className="flex items-start justify-between p-6 rounded-lg bg-brand-dark-border border border-brand-dark-border hover:border-brand-primary/50 transition">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-brand-text mb-2">Maintenance Mode</h3>
                  <p className="text-sm text-brand-text-muted">
                    Temporarily disable platform access for users. Admins can still access.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.maintenance_mode}
                    onChange={(e) => handleMaintenanceModeChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                </label>
              </div>

              <div className="p-6 rounded-lg bg-brand-dark-border">
                <h3 className="text-lg font-semibold text-brand-text mb-4 flex items-center gap-2">
                  <Database size={20} />
                  Database Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-brand-dark-bg">
                    <span className="text-brand-text-muted">Type</span>
                    <span className="text-brand-text font-medium">PostgreSQL</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-brand-dark-bg">
                    <span className="text-brand-text-muted">Host</span>
                    <span className="text-brand-text font-medium">localhost:5432</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-brand-text-muted">Status</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-green-400 font-medium">Connected</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feature Flags */}
          {activeTab === 'features' && (
            <div className="card-dark p-8 space-y-6">
              <div className="space-y-4">
                {Object.entries(settings.feature_flags).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-start justify-between p-6 rounded-lg bg-brand-dark-border border border-brand-dark-border hover:border-brand-primary/50 transition"
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-brand-text capitalize mb-2">
                        {key.replace('_', ' ')}
                      </h3>
                      <p className="text-sm text-brand-text-muted">
                        {key === 'ai_assistant' && 'Enable AI-powered career recommendations'}
                        {key === 'job_matching' && 'Enable intelligent job matching algorithm'}
                        {key === 'applications' && 'Allow users to submit job applications'}
                        {key === 'analytics' && 'Enable analytics and reporting features'}
                      </p>
                    </div>
                       <label className="relative inline-flex items-center cursor-pointer">
                         <input
                           type="checkbox"
                           checked={value}
                           onChange={(e) => handleFeatureFlagChange(key, e.target.checked)}
                           className="sr-only peer"
                         />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 flex gap-3">
                <AlertCircle className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-brand-text-muted">
                  Changes to feature flags take effect immediately for new sessions. Existing users may need to refresh.
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="card-dark p-8 space-y-6">
              <div className="space-y-4">
                {Object.entries(notificationSettings).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-start justify-between p-6 rounded-lg bg-brand-dark-border border border-brand-dark-border hover:border-brand-primary/50 transition"
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-brand-text capitalize mb-2">
                        {key.replace('_', ' ')}
                      </h3>
                      <p className="text-sm text-brand-text-muted">
                        {key === 'email_new_users' && 'Notify on new user registrations'}
                        {key === 'email_suspicious_activity' && 'Alert on suspicious account activity'}
                        {key === 'email_system_errors' && 'Notify on critical system errors'}
                        {key === 'slack_alerts' && 'Send real-time alerts to Slack channel'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => handleNotificationChange(key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Limits */}
          {activeTab === 'limits' && (
            <div className="card-dark p-8 space-y-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-brand-text mb-3">
                    Maximum Users ({settings.max_users.toLocaleString()})
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="100000"
                    step="100"
                    value={settings.max_users}
                    onChange={(e) => handleMaxUsersChange(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-brand-text-muted mt-2">
                    <span>100</span>
                    <span>100,000</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-text mb-3">
                    Applications per User ({settings.max_applications_per_user})
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="10"
                    value={settings.max_applications_per_user}
                    onChange={(e) => handleMaxApplicationsChange(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-brand-text-muted mt-2">
                    <span>10</span>
                    <span>500</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-text mb-3">
                    API Rate Limit ({settings.api_rate_limit} requests/hour)
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={settings.api_rate_limit}
                    onChange={(e) => handleApiRateLimitChange(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-brand-text-muted mt-2">
                    <span>100</span>
                    <span>10,000</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className="card-dark p-8 space-y-6">
              <div className="space-y-4">
                <div className="p-6 rounded-lg bg-brand-dark-border border border-brand-dark-border">
                  <h3 className="text-lg font-semibold text-brand-text mb-4">IP Whitelisting</h3>
                  <p className="text-sm text-brand-text-muted mb-4">
                    Add IPs that are allowed to access admin panel
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="192.168.1.1"
                      className="flex-1 px-4 py-2 rounded-lg bg-brand-dark-bg text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <button className="px-6 py-2 bg-brand-primary text-white rounded-lg hover:opacity-90 transition font-medium">
                      Add
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-lg bg-brand-dark-border border border-brand-dark-border">
                  <h3 className="text-lg font-semibold text-brand-text mb-4">Session Management</h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between py-2">
                      <span className="text-brand-text-muted">Session Timeout</span>
                      <span className="text-brand-text font-medium">30 minutes</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-brand-text-muted">Active Sessions</span>
                      <span className="text-brand-text font-medium">1</span>
                    </div>
                  </div>
                  <button className="text-brand-primary hover:text-brand-accent transition text-sm font-medium">
                    Clear All Sessions
                  </button>
                </div>

                <div className="p-6 rounded-lg bg-brand-dark-border border border-brand-dark-border">
                  <h3 className="text-lg font-semibold text-brand-text mb-4">Two-Factor Authentication</h3>
                  <p className="text-sm text-brand-text-muted mb-4">
                    Enforce 2FA for all admin accounts
                  </p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked={false} />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="card-dark p-6">
            <h3 className="text-lg font-semibold text-brand-text mb-4 flex items-center gap-2">
              <Server size={20} />
              System Status
            </h3>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">API Status</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-400 font-medium">Operational</span>
                </div>
              </div>

              <div className="pt-3 border-t border-brand-dark-border">
                <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Database</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-400 font-medium">Connected</span>
                </div>
              </div>

              <div className="pt-3 border-t border-brand-dark-border">
                <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Uptime</p>
                <span className="text-brand-text font-medium">99.9%</span>
              </div>

              <div className="pt-3 border-t border-brand-dark-border">
                <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Last Check</p>
                <span className="text-brand-text text-sm">Just now</span>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="card-dark p-6">
            <h3 className="text-lg font-semibold text-brand-text mb-4">About Settings</h3>
            <p className="text-sm text-brand-text-muted mb-4">
              Changes made here affect all users and the entire platform. Please be careful when modifying settings.
            </p>
            <div className="space-y-2 text-xs text-brand-text-muted">
              <p>• Changes take effect immediately</p>
              <p>• Some changes may require user re-login</p>
              <p>• Feature flags apply to new sessions only</p>
              <p>• Maintenance mode affects all users</p>
            </div>
          </div>

          {/* Recent Changes Card */}
          <div className="card-dark p-6">
            <h3 className="text-lg font-semibold text-brand-text mb-4">Recent Changes</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2 pb-3 border-b border-brand-dark-border">
                <Check className="text-green-400 flex-shrink-0 mt-0.5" size={16} />
                <div className="text-sm">
                  <p className="text-brand-text-muted">Feature flag updated</p>
                  <p className="text-xs text-brand-text-muted">Today at 10:30 AM</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="text-green-400 flex-shrink-0 mt-0.5" size={16} />
                <div className="text-sm">
                  <p className="text-brand-text-muted">Rate limit modified</p>
                  <p className="text-xs text-brand-text-muted">Yesterday at 3:15 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
