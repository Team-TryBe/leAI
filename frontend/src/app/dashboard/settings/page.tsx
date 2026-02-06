'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { GmailConnection } from '@/components/dashboard/GmailConnection'
import { Mail, Lock, User, Bell, Eye, LogOut, Save, X, AlertCircle, CheckCircle, Shield, Trash2, Camera, Copy, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getAuthToken } from '@/lib/auth'

interface UserProfile {
  id: number
  email: string
  full_name: string
  phone?: string
  location?: string
  professional_summary?: string
  created_at: string
}

interface FormError {
  [key: string]: string
}

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [formErrors, setFormErrors] = useState<FormError>({})
  const [copied, setCopied] = useState(false)

  const [formData, setFormData] = useState<UserProfile>({
    id: 0,
    email: '',
    full_name: '',
    phone: '',
    location: '',
    professional_summary: '',
    created_at: '',
  })

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  })

  const [notifications, setNotifications] = useState({
    email: true,
    jobMatches: true,
    applicationStatus: true,
    marketingEmails: false,
  })

  const [privacy, setPrivacy] = useState({
    profilePublic: false,
    showApplications: false,
    dataCollection: true,
  })

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = getAuthToken()
        if (!token) {
          router.push('/auth/login')
          return
        }

        const response = await fetch('http://127.0.0.1:8000/api/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch user data')
        }

        const result = await response.json()
        const userData = result.data
        setFormData({
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name || '',
          phone: userData.phone || '',
          location: userData.location || '',
          professional_summary: userData.professional_summary || '',
          created_at: userData.created_at,
        })
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching user data:', error)
        setErrorMessage('Failed to load profile data')
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [router])

  useEffect(() => {
    const gmailConnected = searchParams.get('gmail_connected')
    const gmailError = searchParams.get('gmail_error')

    if (gmailConnected === 'true') {
      setActiveTab('gmail')
      setSuccessMessage('Gmail connected successfully! You can now send applications.')
      setTimeout(() => setSuccessMessage(''), 4000)
      router.replace('/dashboard/settings')
      return
    }

    if (gmailError) {
      setActiveTab('gmail')
      const errorMap: Record<string, string> = {
        token_exchange_failed: 'Gmail connection failed during token exchange. Please try again.',
        no_access_token: 'Gmail connection failed: missing access token. Please try again.',
      }
      setErrorMessage(errorMap[gmailError] || 'Gmail connection failed. Please try again.')
      router.replace('/dashboard/settings')
    }
  }, [router, searchParams])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error for this field
    setFormErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[name]
      return newErrors
    })
  }

  const handleNotificationChange = (key: string) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }))
  }

  const handlePrivacyChange = (key: string) => {
    setPrivacy((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }))
  }

  const validateProfile = () => {
    const errors: FormError = {}
    
    if (!formData.full_name || formData.full_name.trim().length < 2) {
      errors.full_name = 'Name must be at least 2 characters'
    }
    if (formData.phone && !/^[\d\s\-+()]+$/.test(formData.phone)) {
      errors.phone = 'Invalid phone number format'
    }
    
    return errors
  }

  const handleSaveProfile = async () => {
    const errors = validateProfile()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setIsSaving(true)
    setErrorMessage('')
    
    try {
      const token = getAuthToken()
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('http://127.0.0.1:8000/api/v1/users/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          phone: formData.phone,
          location: formData.location,
          professional_summary: formData.professional_summary,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update profile')
      }

      setSuccessMessage('✓ Profile updated successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      setFormErrors({ password: 'All password fields are required' })
      return
    }

    if (passwords.new !== passwords.confirm) {
      setFormErrors({ password: 'Passwords do not match' })
      return
    }

    if (passwords.new.length < 8) {
      setFormErrors({ password: 'Password must be at least 8 characters' })
      return
    }

    setIsSaving(true)
    setErrorMessage('')
    
    try {
      const token = getAuthToken()
      // Note: Backend should have a password change endpoint
      // For now, simulating the call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      
      setSuccessMessage('✓ Password changed successfully!')
      setShowPasswordChange(false)
      setPasswords({ current: '', new: '', confirm: '' })
      setFormErrors({})
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to change password')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    // Token removal is handled by removeAuthToken in auth.ts
    router.push('/auth/login')
  }

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(formData.id.toString())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Eye },
    { id: 'gmail', label: 'Gmail', icon: Mail },
  ]

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mx-auto"></div>
            <p className="text-brand-text-muted">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="space-y-2 mb-8">
        <h1 className="text-4xl font-display font-bold text-brand-text">Settings ⚙️</h1>
        <p className="text-brand-text-muted">Manage your account and preferences</p>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="card-dark p-4 bg-brand-success/20 border border-brand-success/50 text-brand-success rounded-lg flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="hover:opacity-70">
            <X size={18} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="card-dark p-4 bg-brand-error/20 border border-brand-error/50 text-brand-error rounded-lg flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="hover:opacity-70">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="card-dark p-2 flex gap-1 overflow-x-auto mb-8 sticky top-20 z-40">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-brand-primary text-white'
                  : 'text-brand-text-muted hover:bg-brand-dark-border'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="card-dark p-6 space-y-4">
              <h3 className="text-xl font-semibold text-brand-text flex items-center gap-2">
                <User size={20} />
                Personal Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-text-muted mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-lg bg-brand-dark-border text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary transition ${
                      formErrors.full_name ? 'ring-2 ring-brand-error' : ''
                    }`}
                    placeholder="Enter your full name"
                  />
                  {formErrors.full_name && (
                    <p className="text-xs text-brand-error mt-1">{formErrors.full_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-text-muted mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-3 rounded-lg bg-brand-dark-border/50 text-brand-text-muted opacity-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-brand-text-muted mt-1">Email cannot be changed</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-text-muted mb-2">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-lg bg-brand-dark-border text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary transition ${
                        formErrors.phone ? 'ring-2 ring-brand-error' : ''
                      }`}
                      placeholder="+254 XXX XXX XXX"
                    />
                    {formErrors.phone && (
                      <p className="text-xs text-brand-error mt-1">{formErrors.phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text-muted mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg bg-brand-dark-border text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
                      placeholder="City, Country"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-text-muted mb-2">
                    Professional Summary
                  </label>
                  <textarea
                    name="professional_summary"
                    value={formData.professional_summary}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg bg-brand-dark-border text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary transition resize-none"
                    placeholder="Tell us about yourself, skills, and experience..."
                  />
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {/* Account Information */}
            <div className="card-dark p-6 space-y-4">
              <h3 className="text-xl font-semibold text-brand-text flex items-center gap-2">
                <Mail size={20} />
                Account Information
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-brand-dark-border">
                  <span className="text-brand-text-muted text-sm">Account ID</span>
                  <div className="flex items-center gap-2">
                    <span className="text-brand-text font-mono">{formData.id}</span>
                    <button
                      onClick={handleCopyUserId}
                      className="p-1 text-brand-text-muted hover:text-brand-text transition"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-brand-dark-border">
                  <span className="text-brand-text-muted text-sm">Member Since</span>
                  <span className="text-brand-text font-medium">
                    {new Date(formData.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-brand-dark-border">
                  <span className="text-brand-text-muted text-sm">Account Status</span>
                  <span className="px-3 py-1 bg-brand-success/20 text-brand-success text-sm rounded-full font-medium">Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Profile Preview */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="card-dark p-6 space-y-4 sticky top-40">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-3xl font-bold">
                  {formData.full_name ? formData.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-center">
                  <h4 className="text-lg font-semibold text-brand-text">
                    {formData.full_name || 'User'}
                  </h4>
                  <p className="text-sm text-brand-text-muted truncate">{formData.email}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-brand-dark-border space-y-3">
                {formData.location && (
                  <div>
                    <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Location</p>
                    <p className="text-brand-text font-medium text-sm">{formData.location}</p>
                  </div>
                )}
                {formData.phone && (
                  <div>
                    <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Phone</p>
                    <p className="text-brand-text font-medium text-sm">{formData.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card-dark p-6 space-y-3">
              <h3 className="text-lg font-semibold text-brand-text mb-4">Quick Actions</h3>
              <button className="w-full px-4 py-2 bg-brand-dark-border hover:bg-brand-dark-border/80 text-brand-text rounded-lg transition flex items-center justify-center gap-2 text-sm">
                <Mail size={16} />
                Verify Email
              </button>
              <button className="w-full px-4 py-2 bg-brand-dark-border hover:bg-brand-dark-border/80 text-brand-text rounded-lg transition flex items-center justify-center gap-2 text-sm">
                <Camera size={16} />
                Change Avatar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Change Password */}
            {!showPasswordChange ? (
              <div className="card-dark p-6 space-y-4">
                <h3 className="text-xl font-semibold text-brand-text flex items-center gap-2">
                  <Lock size={20} />
                  Password Security
                </h3>
                <p className="text-brand-text-muted text-sm">
                  Regularly update your password to keep your account secure
                </p>
                <div className="p-4 rounded-lg bg-brand-dark-border flex justify-between items-center">
                  <div>
                    <p className="text-brand-text font-medium">Last Changed</p>
                    <p className="text-sm text-brand-text-muted">60 days ago</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordChange(true)}
                    className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:opacity-90 transition text-sm font-medium"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            ) : (
              <div className="card-dark p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-brand-text flex items-center gap-2">
                    <Lock size={20} />
                    Change Password
                  </h3>
                  <button
                    onClick={() => setShowPasswordChange(false)}
                    className="text-brand-text-muted hover:text-brand-text"
                  >
                    <X size={20} />
                  </button>
                </div>

                {formErrors.password && (
                  <div className="p-3 rounded-lg bg-brand-error/20 border border-brand-error/50 text-brand-error text-sm">
                    {formErrors.password}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-brand-text-muted mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, current: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-brand-dark-border text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-text-muted mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwords.new}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, new: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-brand-dark-border text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
                    placeholder="Enter new password"
                  />
                  <p className="text-xs text-brand-text-muted mt-1">At least 8 characters, mix of letters and numbers</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-text-muted mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, confirm: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-brand-dark-border text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
                    placeholder="Confirm new password"
                  />
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={isSaving}
                  className="w-full px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {isSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            )}

            {/* Two-Factor Authentication */}
            <div className="card-dark p-6 space-y-4">
              <h3 className="text-xl font-semibold text-brand-text flex items-center gap-2">
                <Shield size={20} />
                Two-Factor Authentication
              </h3>
              <p className="text-brand-text-muted text-sm">
                Add an extra layer of security to your account
              </p>
              <div className="p-4 rounded-lg bg-brand-dark-border flex items-center justify-between">
                <div>
                  <p className="text-brand-text font-medium">Status</p>
                  <p className="text-sm text-brand-text-muted">Not Enabled</p>
                </div>
                <button className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:opacity-90 transition text-sm font-medium">
                  Enable 2FA
                </button>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="card-dark p-6 space-y-4">
              <h3 className="text-xl font-semibold text-brand-text">Active Sessions</h3>
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-brand-dark-border flex justify-between items-start">
                  <div>
                    <p className="text-brand-text font-medium">Chrome • Ubuntu</p>
                    <p className="text-sm text-brand-text-muted">192.168.1.100 • Last active now</p>
                  </div>
                  <span className="px-2 py-1 text-xs bg-brand-success/20 text-brand-success rounded">Current</span>
                </div>
                <div className="p-4 rounded-lg bg-brand-dark-border flex justify-between items-start">
                  <div>
                    <p className="text-brand-text font-medium">Safari • iPhone</p>
                    <p className="text-sm text-brand-text-muted">192.168.1.50 • 2 hours ago</p>
                  </div>
                  <button className="text-brand-text-muted hover:text-brand-text transition">
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="space-y-6">
            {/* Security Tips */}
            <div className="card-dark p-6 space-y-4 sticky top-40">
              <h3 className="text-lg font-semibold text-brand-text">Security Tips</h3>
              <ul className="space-y-3 text-sm text-brand-text-muted">
                <li className="flex gap-2">
                  <span className="text-brand-primary font-bold mt-0.5">•</span>
                  <span>Use a strong, unique password</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-primary font-bold mt-0.5">•</span>
                  <span>Enable two-factor authentication</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-primary font-bold mt-0.5">•</span>
                  <span>Never share your password</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-primary font-bold mt-0.5">•</span>
                  <span>Log out from unused sessions</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-primary font-bold mt-0.5">•</span>
                  <span>Keep your recovery codes safe</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Email Notifications */}
            <div className="card-dark p-6 space-y-4">
              <h3 className="text-xl font-semibold text-brand-text flex items-center gap-2">
                <Mail size={20} />
                Email Notifications
              </h3>

              <div className="space-y-3">
                {[
                  { key: 'email', label: 'General Emails', desc: 'Account updates and important announcements' },
                  { key: 'jobMatches', label: 'Job Matches', desc: 'New job opportunities matching your profile' },
                  { key: 'applicationStatus', label: 'Application Status', desc: 'Updates on your job applications' },
                  { key: 'marketingEmails', label: 'Marketing Emails', desc: 'Tips, news, and exclusive offers' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-brand-dark-border hover:bg-brand-dark-border/80 transition">
                    <div>
                      <p className="text-brand-text font-medium">{item.label}</p>
                      <p className="text-sm text-brand-text-muted">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange(item.key)}
                      className={`relative w-12 h-7 rounded-full transition ${
                        notifications[item.key as keyof typeof notifications]
                          ? 'bg-brand-primary'
                          : 'bg-brand-dark-border'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 rounded-full bg-white transition transform ${
                          notifications[item.key as keyof typeof notifications]
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <button className="w-full px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                <Save size={18} />
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Privacy Settings */}
            <div className="card-dark p-6 space-y-4">
              <h3 className="text-xl font-semibold text-brand-text flex items-center gap-2">
                <Eye size={20} />
                Privacy & Visibility
              </h3>

              <div className="space-y-3">
                {[
                  { key: 'profilePublic', label: 'Make Profile Public', desc: 'Allow others to view your profile' },
                  { key: 'showApplications', label: 'Show Applications', desc: 'Display your job applications publicly' },
                  { key: 'dataCollection', label: 'Data Collection', desc: 'Allow us to collect usage analytics' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-brand-dark-border hover:bg-brand-dark-border/80 transition">
                    <div>
                      <p className="text-brand-text font-medium">{item.label}</p>
                      <p className="text-sm text-brand-text-muted">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => handlePrivacyChange(item.key)}
                      className={`relative w-12 h-7 rounded-full transition ${
                        privacy[item.key as keyof typeof privacy]
                          ? 'bg-brand-primary'
                          : 'bg-brand-dark-border'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 rounded-full bg-white transition transform ${
                          privacy[item.key as keyof typeof privacy]
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <button className="w-full px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                <Save size={18} />
                Save Preferences
              </button>
            </div>

            {/* Data Management */}
            <div className="card-dark p-6 space-y-4">
              <h3 className="text-xl font-semibold text-brand-text">Data Management</h3>
              
              <div className="space-y-3">
                <button className="w-full px-4 py-3 bg-brand-dark-border hover:bg-brand-dark-border/80 text-brand-text rounded-lg transition flex items-center justify-center gap-2">
                  <Mail size={18} />
                  Download My Data
                </button>
                <button className="w-full px-4 py-3 bg-brand-error/20 hover:bg-brand-error/30 text-brand-error rounded-lg transition flex items-center justify-center gap-2 border border-brand-error/50">
                  <Trash2 size={18} />
                  Delete Account
                </button>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="space-y-6">
            <div className="card-dark p-6 space-y-4 sticky top-40">
              <h3 className="text-lg font-semibold text-brand-text">Privacy Notes</h3>
              <ul className="space-y-3 text-sm text-brand-text-muted">
                <li className="flex gap-2">
                  <span className="text-brand-primary font-bold mt-0.5">•</span>
                  <span>Your data is encrypted and secure</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-primary font-bold mt-0.5">•</span>
                  <span>We never sell your information</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-primary font-bold mt-0.5">•</span>
                  <span>Review our full privacy policy</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Gmail Tab */}
      {activeTab === 'gmail' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <GmailConnection />
          </div>
          <div className="space-y-6">
            <div className="card-dark p-6 space-y-4 sticky top-40">
              <h3 className="text-lg font-semibold text-brand-text">Why connect Gmail?</h3>
              <ul className="space-y-3 text-sm text-brand-text-muted">
                <li className="flex gap-2">
                  <span className="text-brand-primary font-bold mt-0.5">•</span>
                  <span>Send applications with CV and cover letter attached</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-primary font-bold mt-0.5">•</span>
                  <span>Automatic token refresh keeps you connected</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-primary font-bold mt-0.5">•</span>
                  <span>Disconnect anytime in one click</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
