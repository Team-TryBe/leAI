'use client'

import { useEffect, useState } from 'react'
import { User, Shield, Mail, MapPin, Phone, Calendar, Copy, Check, Lock, Edit2, Activity, Clock, Key, AlertCircle, Save, X } from 'lucide-react'
import { getAuthToken } from '@/lib/auth'

interface AdminProfile {
  id: number
  email: string
  full_name: string
  phone?: string
  location?: string
  professional_summary?: string
  is_admin: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function AdminAccountPage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [formData, setFormData] = useState<Partial<AdminProfile>>({})

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = getAuthToken()
        if (!token) return

        const response = await fetch('http://127.0.0.1:8000/api/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) throw new Error('Failed to fetch profile')

        const result = await response.json()
        const userData = result.data
        setProfile(userData)
        setFormData(userData)
        setIsLoading(false)
      } catch (err) {
        console.error('Error fetching profile:', err)
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleCopyId = () => {
    if (profile) {
      navigator.clipboard.writeText(profile.id.toString())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSaveProfile = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

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

      if (!response.ok) throw new Error('Failed to update profile')

      const result = await response.json()
      setProfile(result.data)
      setShowEditForm(false)
      alert('Profile updated successfully')
    } catch (err) {
      console.error('Error updating profile:', err)
      alert('Failed to update profile')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
          <p className="text-brand-text-muted">Loading account information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-brand-text mb-1">My Account</h1>
          <p className="text-sm text-brand-text-muted">
            View and manage your administrator profile
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header Card */}
            <div className="card-dark p-6">
              <div className="flex items-start gap-6 mb-6 pb-6 border-b border-brand-dark-border">
                {/* Avatar */}
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-3xl font-bold ring-4 ring-brand-primary/20">
                    {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-brand-dark-card"></div>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-brand-text mb-1">{profile?.full_name}</h2>
                  <p className="text-sm text-brand-text-muted mb-3">{profile?.email}</p>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 w-fit">
                    <Shield className="text-purple-400" size={16} />
                    <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                      Administrator
                    </span>
                  </div>
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => setShowEditForm(!showEditForm)}
                  className={`px-5 py-2.5 rounded-lg font-medium transition flex items-center gap-2 text-sm ${
                    showEditForm
                      ? 'bg-brand-dark-border text-brand-text hover:bg-brand-dark-border/70'
                      : 'bg-gradient-to-r from-brand-primary to-brand-accent text-white hover:opacity-90'
                  }`}
                >
                  {showEditForm ? <X size={16} /> : <Edit2 size={16} />}
                  {showEditForm ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>

              {/* Profile Details */}
              {!showEditForm ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email */}
                    <div className="group">
                      <label className="text-xs text-brand-text-muted uppercase tracking-wider mb-2 block font-medium">
                        Email Address
                      </label>
                      <div className="flex items-center gap-3 p-3.5 rounded-lg bg-brand-dark-border border border-transparent group-hover:border-brand-primary/30 transition">
                        <div className="p-1.5 rounded bg-blue-500/10">
                          <Mail size={16} className="text-blue-400" />
                        </div>
                        <span className="text-sm text-brand-text">{profile?.email}</span>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="group">
                      <label className="text-xs text-brand-text-muted uppercase tracking-wider mb-2 block font-medium">
                        Phone Number
                      </label>
                      <div className="flex items-center gap-3 p-3.5 rounded-lg bg-brand-dark-border border border-transparent group-hover:border-brand-primary/30 transition">
                        <div className="p-1.5 rounded bg-emerald-500/10">
                          <Phone size={16} className="text-emerald-400" />
                        </div>
                        <span className="text-sm text-brand-text">{profile?.phone || 'Not provided'}</span>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="group">
                      <label className="text-xs text-brand-text-muted uppercase tracking-wider mb-2 block font-medium">
                        Location
                      </label>
                      <div className="flex items-center gap-3 p-3.5 rounded-lg bg-brand-dark-border border border-transparent group-hover:border-brand-primary/30 transition">
                        <div className="p-1.5 rounded bg-cyan-500/10">
                          <MapPin size={16} className="text-cyan-400" />
                        </div>
                        <span className="text-sm text-brand-text">{profile?.location || 'Not provided'}</span>
                      </div>
                    </div>

                    {/* Account Status */}
                    <div className="group">
                      <label className="text-xs text-brand-text-muted uppercase tracking-wider mb-2 block font-medium">
                        Account Status
                      </label>
                      <div className="flex items-center gap-3 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        <span className="text-sm text-emerald-400 font-semibold">Active</span>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  {profile?.professional_summary && (
                    <div className="pt-2">
                      <label className="text-xs text-brand-text-muted uppercase tracking-wider mb-2 block font-medium">
                        Professional Summary
                      </label>
                      <div className="p-4 rounded-lg bg-brand-dark-border text-sm text-brand-text leading-relaxed">
                        {profile.professional_summary}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-text mb-2">Full Name</label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-brand-text mb-2">Phone Number</label>
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone || ''}
                        onChange={handleInputChange}
                        placeholder="+254..."
                        className="w-full px-4 py-2.5 rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-text mb-2">Location</label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location || ''}
                        onChange={handleInputChange}
                        placeholder="Nairobi, Kenya"
                        className="w-full px-4 py-2.5 rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brand-text mb-2">Professional Summary</label>
                    <textarea
                      name="professional_summary"
                      value={formData.professional_summary || ''}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder="Tell us about your professional background..."
                      className="w-full px-4 py-2.5 rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none"
                    />
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    className="w-full px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    Save Changes
                  </button>
                </div>
              )}
            </div>

            {/* Security Card */}
            <div className="card-dark p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Lock className="text-red-400" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-brand-text">Security Settings</h3>
                  <p className="text-xs text-brand-text-muted">Manage authentication and access</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Password */}
                <div className="p-5 rounded-lg bg-brand-dark-border border border-brand-dark-border hover:border-brand-primary/30 transition group">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 group-hover:scale-110 transition-transform">
                      <Key className="text-blue-400" size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-brand-text font-semibold">Password</p>
                        <span className="text-xs text-brand-text-muted">Last changed 60 days ago</span>
                      </div>
                      <p className="text-xs text-brand-text-muted mb-3">
                        Update your password regularly to keep your account secure
                      </p>
                      <button className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark transition text-sm font-medium">
                        Change Password
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2FA */}
                <div className="p-5 rounded-lg bg-amber-500/10 border border-amber-500/30 group">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20 group-hover:scale-110 transition-transform">
                      <Shield className="text-amber-400" size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-brand-text font-semibold">Two-Factor Authentication</p>
                        <span className="text-xs px-2 py-1 bg-amber-500/30 text-amber-300 rounded font-medium">Not Enabled</span>
                      </div>
                      <p className="text-xs text-amber-200/80 mb-3">
                        Add an extra layer of security to your admin account
                      </p>
                      <button className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition text-sm font-medium">
                        Enable 2FA
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Account Info Card */}
            <div className="card-dark p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <User className="text-purple-400" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-brand-text">Account Details</h3>
                  <p className="text-xs text-brand-text-muted">Basic information</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-2 font-medium">Account ID</p>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-dark-border">
                    <span className="text-brand-text font-mono text-sm flex-1">{profile?.id}</span>
                    <button
                      onClick={handleCopyId}
                      className="p-1.5 text-brand-text-muted hover:text-brand-text transition rounded hover:bg-brand-dark-bg"
                      title="Copy ID"
                    >
                      {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-brand-dark-border">
                  <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-2 font-medium">Account Type</p>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <Shield className="text-purple-400" size={16} />
                    <span className="text-sm text-purple-400 font-semibold">Administrator</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-brand-dark-border">
                  <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-2 font-medium">Member Since</p>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-dark-border">
                    <Calendar className="text-brand-text-muted" size={16} />
                    <span className="text-sm text-brand-text">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-brand-dark-border">
                  <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-2 font-medium">Last Updated</p>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-dark-border">
                    <Clock className="text-brand-text-muted" size={16} />
                    <span className="text-sm text-brand-text">
                      {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Privileges Card */}
            <div className="card-dark p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Shield className="text-emerald-400" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-brand-text">Admin Privileges</h3>
                  <p className="text-xs text-brand-text-muted">Full access granted</p>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { label: 'User Management', icon: User },
                  { label: 'Application Management', icon: Activity },
                  { label: 'Analytics & Reporting', icon: Activity },
                  { label: 'System Settings', icon: Activity },
                  { label: 'Role Management', icon: Shield }
                ].map((privilege, index) => {
                  const Icon = privilege.icon
                  return (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <Check className="text-emerald-400 flex-shrink-0" size={16} />
                      <span className="text-xs text-emerald-300 font-medium">{privilege.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Activity Status Card */}
            <div className="card-dark p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Activity className="text-blue-400" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-brand-text">Activity Status</h3>
                  <p className="text-xs text-brand-text-muted">Current session</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <p className="text-xs text-brand-text-muted mb-1">Account Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-emerald-400 font-semibold">Active</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <p className="text-xs text-brand-text-muted mb-1">Admin Privileges</p>
                  <div className="flex items-center gap-2">
                    <Shield className="text-purple-400" size={16} />
                    <span className="text-sm text-purple-400 font-semibold">Enabled</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="card-dark p-5 bg-amber-500/5 border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h3 className="text-sm font-semibold text-amber-300 mb-1">Security Reminder</h3>
                  <p className="text-xs text-amber-200/80 leading-relaxed">
                    Enable two-factor authentication to add an extra layer of security to your admin account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
