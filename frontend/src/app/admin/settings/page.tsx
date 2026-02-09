'use client'

import { useEffect, useState } from 'react'
import { Settings, Database, Shield, Bell, Users, Zap, Server, Check, AlertCircle, Activity, Lock, Mail, Slash, RefreshCw, Globe, Clock, Terminal } from 'lucide-react'
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
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
          <p className="text-brand-text-muted">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-brand-text mb-1">System Settings</h1>
            <p className="text-sm text-brand-text-muted">
              Configure platform behavior, features, and security
            </p>
          </div>

          {hasChanges && (
            <button
              onClick={handleSaveSettings}
              className="px-6 py-2.5 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-semibold hover:opacity-90 transition shadow-lg flex items-center gap-2"
            >
              <Check size={18} />
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
              className={`px-4 py-3 text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap border-b-2 ${
                activeTab === id
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-brand-text-muted hover:text-brand-text'
              }`}
            >
              <Icon size={16} />
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
              <div className="space-y-4">
                {/* Maintenance Mode Card */}
                <div className="card-dark p-6 hover:border-brand-primary/50 transition group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-amber-500/10 group-hover:scale-110 transition-transform">
                        <AlertCircle className="text-amber-400" size={20} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-brand-text mb-1">Maintenance Mode</h3>
                        <p className="text-sm text-brand-text-muted">
                          Temporarily disable platform access for users. Admins can still access.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={settings.maintenance_mode}
                        onChange={(e) => handleMaintenanceModeChange(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                    </label>
                  </div>
                  {settings.maintenance_mode && (
                    <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-300">
                      ⚠️ Platform is currently in maintenance mode
                    </div>
                  )}
                </div>

                {/* Database Information Card */}
                <div className="card-dark p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 rounded-lg bg-blue-500/10">
                      <Database className="text-blue-400" size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-brand-text">Database Information</h3>
                      <p className="text-xs text-brand-text-muted">Connection and status details</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-3 border-b border-brand-dark-border">
                      <span className="text-sm text-brand-text-muted">Database Type</span>
                      <span className="text-sm text-brand-text font-medium">PostgreSQL</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-brand-dark-border">
                      <span className="text-sm text-brand-text-muted">Host</span>
                      <span className="text-sm text-brand-text font-mono">localhost:5432</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-sm text-brand-text-muted">Connection Status</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-sm text-green-400 font-medium">Connected</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Info Card */}
                <div className="card-dark p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 rounded-lg bg-purple-500/10">
                      <Terminal className="text-purple-400" size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-brand-text">System Information</h3>
                      <p className="text-xs text-brand-text-muted">Platform version and environment</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-brand-dark-border">
                      <p className="text-xs text-brand-text-muted mb-1">Version</p>
                      <p className="text-sm text-brand-text font-semibold">v2.0.1</p>
                    </div>
                    <div className="p-4 rounded-lg bg-brand-dark-border">
                      <p className="text-xs text-brand-text-muted mb-1">Environment</p>
                      <p className="text-sm text-emerald-400 font-semibold">Production</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Feature Flags */}
            {activeTab === 'features' && (
              <div className="space-y-4">
                <div className="card-dark p-5">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Zap className="text-purple-400" size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-brand-text">Feature Toggles</h3>
                      <p className="text-xs text-brand-text-muted">Enable or disable platform features</p>
                    </div>
                  </div>
                </div>

                {Object.entries(settings.feature_flags).map(([key, value]) => {
                  const featureIcons = {
                    ai_assistant: Zap,
                    job_matching: Activity,
                    applications: Globe,
                    analytics: Server
                  }
                  const featureColors = {
                    ai_assistant: 'bg-purple-500/10',
                    job_matching: 'bg-emerald-500/10',
                    applications: 'bg-blue-500/10',
                    analytics: 'bg-amber-500/10'
                  }
                  const featureTextColors = {
                    ai_assistant: 'text-purple-400',
                    job_matching: 'text-emerald-400',
                    applications: 'text-blue-400',
                    analytics: 'text-amber-400'
                  }
                  const Icon = featureIcons[key as keyof typeof featureIcons] || Zap
                  
                  return (
                    <div
                      key={key}
                      className="card-dark p-5 hover:border-brand-primary/50 transition group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2.5 rounded-lg ${featureColors[key as keyof typeof featureColors]} group-hover:scale-110 transition-transform`}>
                            <Icon className={featureTextColors[key as keyof typeof featureTextColors]} size={20} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-brand-text capitalize mb-1">
                              {key.replace('_', ' ')}
                            </h3>
                            <p className="text-sm text-brand-text-muted">
                              {key === 'ai_assistant' && 'Enable AI-powered career recommendations and insights'}
                              {key === 'job_matching' && 'Enable intelligent job matching algorithm'}
                              {key === 'applications' && 'Allow users to create and submit job applications'}
                              {key === 'analytics' && 'Enable analytics dashboard and reporting features'}
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handleFeatureFlagChange(key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                        </label>
                      </div>
                    </div>
                  )
                })}

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 flex gap-3">
                  <AlertCircle className="text-blue-400 flex-shrink-0 mt-0.5" size={18} />
                  <div className="text-sm text-blue-300">
                    Changes to feature flags take effect immediately for new sessions. Existing users may need to refresh.
                  </div>
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <div className="card-dark p-5">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 rounded-lg bg-cyan-500/10">
                      <Bell className="text-cyan-400" size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-brand-text">Notification Preferences</h3>
                      <p className="text-xs text-brand-text-muted">Configure admin alerts and notifications</p>
                    </div>
                  </div>
                </div>

                {Object.entries(notificationSettings).map(([key, value]) => {
                  const notifIcons = {
                    email_new_users: Users,
                    email_suspicious_activity: Shield,
                    email_system_errors: AlertCircle,
                    slack_alerts: Bell
                  }
                  const notifColors = {
                    email_new_users: 'bg-blue-500/10',
                    email_suspicious_activity: 'bg-red-500/10',
                    email_system_errors: 'bg-amber-500/10',
                    slack_alerts: 'bg-purple-500/10'
                  }
                  const notifTextColors = {
                    email_new_users: 'text-blue-400',
                    email_suspicious_activity: 'text-red-400',
                    email_system_errors: 'text-amber-400',
                    slack_alerts: 'text-purple-400'
                  }
                  const Icon = notifIcons[key as keyof typeof notifIcons] || Bell

                  return (
                    <div
                      key={key}
                      className="card-dark p-5 hover:border-brand-primary/50 transition group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2.5 rounded-lg ${notifColors[key as keyof typeof notifColors]} group-hover:scale-110 transition-transform`}>
                            <Icon className={notifTextColors[key as keyof typeof notifTextColors]} size={20} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-brand-text capitalize mb-1">
                              {key.replace(/_/g, ' ')}
                            </h3>
                            <p className="text-sm text-brand-text-muted">
                              {key === 'email_new_users' && 'Receive email notifications when new users register'}
                              {key === 'email_suspicious_activity' && 'Get alerts on suspicious account activity'}
                              {key === 'email_system_errors' && 'Notify on critical system errors and failures'}
                              {key === 'slack_alerts' && 'Send real-time alerts to configured Slack channel'}
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handleNotificationChange(key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Limits */}
            {activeTab === 'limits' && (
              <div className="space-y-4">
                <div className="card-dark p-5">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <Server className="text-emerald-400" size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-brand-text">Resource Limits</h3>
                      <p className="text-xs text-brand-text-muted">Configure platform capacity and rate limits</p>
                    </div>
                  </div>
                </div>

                {/* Max Users */}
                <div className="card-dark p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-brand-text">Maximum Users</label>
                      <span className="text-2xl font-bold text-brand-primary">{settings.max_users.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-brand-text-muted mb-4">Total number of users allowed on the platform</p>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="100000"
                    step="100"
                    value={settings.max_users}
                    onChange={(e) => handleMaxUsersChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-brand-dark-border rounded-lg appearance-none cursor-pointer accent-brand-primary"
                  />
                  <div className="flex justify-between text-xs text-brand-text-muted mt-2">
                    <span>100</span>
                    <span>100,000</span>
                  </div>
                </div>

                {/* Max Applications */}
                <div className="card-dark p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-brand-text">Applications per User</label>
                      <span className="text-2xl font-bold text-brand-primary">{settings.max_applications_per_user}</span>
                    </div>
                    <p className="text-xs text-brand-text-muted mb-4">Maximum job applications each user can create</p>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="10"
                    value={settings.max_applications_per_user}
                    onChange={(e) => handleMaxApplicationsChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-brand-dark-border rounded-lg appearance-none cursor-pointer accent-brand-primary"
                  />
                  <div className="flex justify-between text-xs text-brand-text-muted mt-2">
                    <span>10</span>
                    <span>500</span>
                  </div>
                </div>

                {/* API Rate Limit */}
                <div className="card-dark p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-brand-text">API Rate Limit</label>
                      <span className="text-2xl font-bold text-brand-primary">{settings.api_rate_limit}</span>
                    </div>
                    <p className="text-xs text-brand-text-muted mb-4">Maximum API requests per hour per user</p>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={settings.api_rate_limit}
                    onChange={(e) => handleApiRateLimitChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-brand-dark-border rounded-lg appearance-none cursor-pointer accent-brand-primary"
                  />
                  <div className="flex justify-between text-xs text-brand-text-muted mt-2">
                    <span>100</span>
                    <span>10,000</span>
                  </div>
                </div>
              </div>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <div className="card-dark p-5">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <Shield className="text-red-400" size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-brand-text">Security Settings</h3>
                      <p className="text-xs text-brand-text-muted">Configure access control and authentication</p>
                    </div>
                  </div>
                </div>

                {/* IP Whitelisting */}
                <div className="card-dark p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Globe className="text-blue-400" size={18} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-brand-text mb-1">IP Whitelisting</h3>
                      <p className="text-sm text-brand-text-muted mb-4">
                        Restrict admin panel access to specific IP addresses
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="192.168.1.1"
                          className="flex-1 px-4 py-2.5 rounded-lg bg-brand-dark-bg text-brand-text placeholder-brand-text-muted border border-brand-dark-border focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                        />
                        <button className="px-5 py-2.5 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark transition font-medium text-sm">
                          Add IP
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-brand-dark-border">
                    <p className="text-xs text-brand-text-muted">No IPs configured</p>
                  </div>
                </div>

                {/* Session Management */}
                <div className="card-dark p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Clock className="text-purple-400" size={18} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-brand-text mb-1">Session Management</h3>
                      <p className="text-sm text-brand-text-muted mb-4">
                        Control user session behavior and timeouts
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-3 border-b border-brand-dark-border">
                      <span className="text-sm text-brand-text-muted">Session Timeout</span>
                      <span className="text-sm text-brand-text font-semibold">30 minutes</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-brand-dark-border">
                      <span className="text-sm text-brand-text-muted">Active Sessions</span>
                      <span className="text-sm text-brand-text font-semibold">1</span>
                    </div>
                    <div className="pt-2">
                      <button className="text-brand-primary hover:text-brand-accent transition text-sm font-medium flex items-center gap-2">
                        <Slash size={14} />
                        Clear All Sessions
                      </button>
                    </div>
                  </div>
                </div>

                {/* Two-Factor Authentication */}
                <div className="card-dark p-6 hover:border-brand-primary/50 transition group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 group-hover:scale-110 transition-transform">
                        <Lock className="text-emerald-400" size={20} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-brand-text mb-1">Two-Factor Authentication</h3>
                        <p className="text-sm text-brand-text-muted">
                          Require 2FA for all admin account logins
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input type="checkbox" className="sr-only peer" defaultChecked={false} />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Status Card */}
            <div className="card-dark p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Activity className="text-emerald-400" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-brand-text">System Status</h3>
                  <p className="text-xs text-brand-text-muted">Real-time health</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-brand-text-muted uppercase tracking-wider">API Status</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-emerald-400 font-semibold">Online</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-brand-text-muted uppercase tracking-wider">Database</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-emerald-400 font-semibold">Connected</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-brand-dark-border space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-brand-text-muted">Uptime</p>
                    <span className="text-sm text-brand-text font-semibold">99.9%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-brand-text-muted">Last Check</p>
                    <span className="text-xs text-brand-text">Just now</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="card-dark p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <AlertCircle className="text-blue-400" size={18} />
                </div>
                <h3 className="text-base font-semibold text-brand-text">Important Notice</h3>
              </div>
              <p className="text-sm text-brand-text-muted mb-3">
                Changes made here affect the entire platform. Exercise caution when modifying settings.
              </p>
              <div className="space-y-1.5 text-xs text-brand-text-muted">
                <div className="flex items-start gap-2">
                  <Check className="text-brand-primary flex-shrink-0 mt-0.5" size={14} />
                  <span>Changes take effect immediately</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="text-brand-primary flex-shrink-0 mt-0.5" size={14} />
                  <span>Some changes may require re-login</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="text-brand-primary flex-shrink-0 mt-0.5" size={14} />
                  <span>Feature flags apply to new sessions</span>
                </div>
              </div>
            </div>

            {/* Recent Changes Card */}
            <div className="card-dark p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Clock className="text-purple-400" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-brand-text">Recent Changes</h3>
                  <p className="text-xs text-brand-text-muted">Last 24 hours</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-brand-dark-border">
                  <Check className="text-emerald-400 flex-shrink-0 mt-0.5" size={16} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-brand-text font-medium">Feature flag updated</p>
                    <p className="text-xs text-brand-text-muted mt-0.5">Today at 10:30 AM</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-brand-dark-border">
                  <Check className="text-emerald-400 flex-shrink-0 mt-0.5" size={16} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-brand-text font-medium">Rate limit modified</p>
                    <p className="text-xs text-brand-text-muted mt-0.5">Yesterday at 3:15 PM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card-dark p-5">
              <h3 className="text-base font-semibold text-brand-text mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full px-4 py-2.5 rounded-lg bg-brand-dark-border hover:bg-brand-dark-border/70 text-sm text-brand-text font-medium transition text-left flex items-center gap-2">
                  <RefreshCw size={14} />
                  Clear Cache
                </button>
                <button className="w-full px-4 py-2.5 rounded-lg bg-brand-dark-border hover:bg-brand-dark-border/70 text-sm text-brand-text font-medium transition text-left flex items-center gap-2">
                  <Database size={14} />
                  Backup Database
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
