'use client'

import { AdminLayout } from '@/components/admin/AdminLayout'
import { useEffect, useState } from 'react'
import { User, Shield, Mail, MapPin, Phone, Calendar, Copy, Check, Lock, Edit2 } from 'lucide-react'
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
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mx-auto"></div>
            <p className="text-brand-text-muted">Loading account information...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-brand-text mb-2">My Account</h1>
        <p className="text-brand-text-muted">View and manage your admin account</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Header Card */}
          <div className="card-dark p-8">
            <div className="flex items-end gap-6 mb-8 pb-8 border-b border-brand-dark-border">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-4xl font-bold">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'A'}
              </div>

              {/* Info */}
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-brand-text mb-1">{profile?.full_name}</h2>
                <p className="text-brand-text-muted mb-3">{profile?.email}</p>
                <div className="flex items-center gap-2">
                  <Shield className="text-brand-primary" size={18} />
                  <span className="text-sm font-semibold text-brand-primary uppercase tracking-wider">
                    Admin Account
                  </span>
                </div>
              </div>

              {/* Edit Button */}
              <button
                onClick={() => setShowEditForm(!showEditForm)}
                className="px-6 py-2 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-medium hover:opacity-90 transition flex items-center gap-2"
              >
                <Edit2 size={18} />
                {showEditForm ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            {/* Profile Details */}
            {!showEditForm ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div>
                    <label className="text-xs text-brand-text-muted uppercase tracking-wider mb-2 block">Email Address</label>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-dark-border">
                      <Mail size={18} className="text-brand-text-muted" />
                      <span className="text-brand-text">{profile?.email}</span>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-xs text-brand-text-muted uppercase tracking-wider mb-2 block">Phone</label>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-dark-border">
                      <Phone size={18} className="text-brand-text-muted" />
                      <span className="text-brand-text">{profile?.phone || 'Not provided'}</span>
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="text-xs text-brand-text-muted uppercase tracking-wider mb-2 block">Location</label>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-dark-border">
                      <MapPin size={18} className="text-brand-text-muted" />
                      <span className="text-brand-text">{profile?.location || 'Not provided'}</span>
                    </div>
                  </div>

                  {/* Account Status */}
                  <div>
                    <label className="text-xs text-brand-text-muted uppercase tracking-wider mb-2 block">Account Status</label>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-dark-border">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-brand-text font-medium">Active</span>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {profile?.professional_summary && (
                  <div>
                    <label className="text-xs text-brand-text-muted uppercase tracking-wider mb-2 block">Professional Summary</label>
                    <div className="p-4 rounded-lg bg-brand-dark-border text-brand-text">
                      {profile.professional_summary}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-text-muted mb-2">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg bg-brand-dark-border text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-text-muted mb-2">Phone</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-brand-dark-border text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text-muted mb-2">Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg bg-brand-dark-border text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-text-muted mb-2">Professional Summary</label>
                  <textarea
                    name="professional_summary"
                    value={formData.professional_summary || ''}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg bg-brand-dark-border text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                  />
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="w-full px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-semibold hover:opacity-90 transition"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>

          {/* Security Card */}
          <div className="card-dark p-6">
            <h3 className="text-xl font-semibold text-brand-text mb-6 flex items-center gap-2">
              <Lock size={24} />
              Security Settings
            </h3>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-brand-dark-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-brand-text font-medium">Password</p>
                  <span className="text-xs text-brand-text-muted">Last changed 60 days ago</span>
                </div>
                <p className="text-sm text-brand-text-muted mb-4">
                  Update your password regularly to keep your account secure
                </p>
                <button className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:opacity-90 transition text-sm font-medium">
                  Change Password
                </button>
              </div>

              <div className="p-4 rounded-lg bg-brand-dark-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-brand-text font-medium">Two-Factor Authentication</p>
                  <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">Not Enabled</span>
                </div>
                <p className="text-sm text-brand-text-muted mb-4">
                  Enable 2FA for an extra layer of security
                </p>
                <button className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:opacity-90 transition text-sm font-medium">
                  Enable 2FA
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Info Card */}
          <div className="card-dark p-6">
            <h3 className="text-lg font-semibold text-brand-text mb-4">Account Information</h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-2">Account ID</p>
                <div className="flex items-center gap-2">
                  <span className="text-brand-text font-mono text-lg">{profile?.id}</span>
                  <button
                    onClick={handleCopyId}
                    className="p-1 text-brand-text-muted hover:text-brand-text transition"
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-brand-dark-border">
                <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-2">Account Type</p>
                <div className="flex items-center gap-2">
                  <Shield className="text-brand-primary" size={18} />
                  <span className="text-brand-text font-semibold">Administrator</span>
                </div>
              </div>

              <div className="pt-4 border-t border-brand-dark-border">
                <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-2">Member Since</p>
                <span className="text-brand-text">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                </span>
              </div>

              <div className="pt-4 border-t border-brand-dark-border">
                <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-2">Last Updated</p>
                <span className="text-brand-text">
                  {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Privileges Card */}
          <div className="card-dark p-6">
            <h3 className="text-lg font-semibold text-brand-text mb-4">Admin Privileges</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-dark-border">
                <Check className="text-green-400" size={20} />
                <span className="text-sm text-brand-text">User Management</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-dark-border">
                <Check className="text-green-400" size={20} />
                <span className="text-sm text-brand-text">Application Management</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-dark-border">
                <Check className="text-green-400" size={20} />
                <span className="text-sm text-brand-text">Analytics & Reporting</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-dark-border">
                <Check className="text-green-400" size={20} />
                <span className="text-sm text-brand-text">System Settings</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-dark-border">
                <Check className="text-green-400" size={20} />
                <span className="text-sm text-brand-text">Role Management</span>
              </div>
            </div>
          </div>

          {/* Activity Card */}
          <div className="card-dark p-6">
            <h3 className="text-lg font-semibold text-brand-text mb-4">Account Status</h3>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Status</p>
                <div className="inline-block px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full font-medium">
                  Active
                </div>
              </div>

              <div className="pt-3 border-t border-brand-dark-border">
                <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-2">Admin Role</p>
                <div className="inline-flex items-center gap-2">
                  <Shield className="text-brand-primary" size={18} />
                  <span className="text-brand-text font-semibold">Enabled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
