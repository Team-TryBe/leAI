'use client'

import { useEffect, useState } from 'react'
import {
  Search,
  UserX,
  UserCheck,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Lock,
  Clock,
  MapPin,
  LogIn,
} from 'lucide-react'
import { getAuthToken } from '@/lib/auth'

type FilterType = 'all' | 'admin' | 'active' | 'inactive'
type UserRole = 'candidate' | 'support_agent' | 'finance_admin' | 'content_manager' | 'compliance_officer' | 'super_admin' | 'recruiter' | 'university_verifier'

interface User {
  id: number
  email: string
  full_name: string
  phone?: string
  location?: string
  is_admin: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  last_login_at?: string | null
  last_login_ip?: string | null
  mfa_enabled?: boolean
  role?: UserRole
  subscription?: {
    plan_id: number
    plan_type: string
    plan_name: string
    status: string
    current_period_end: string | null
    auto_renew: boolean
  } | null
}

const ROLES: { id: UserRole; label: string; description: string; color: string }[] = [
  { id: 'super_admin', label: 'Super Admin', description: 'Full system control', color: 'from-red-500 to-red-600' },
  { id: 'support_agent', label: 'Support Agent', description: 'Customer support', color: 'from-blue-500 to-blue-600' },
  { id: 'finance_admin', label: 'Finance Admin', description: 'Financial operations', color: 'from-green-500 to-green-600' },
  { id: 'content_manager', label: 'Content Manager', description: 'Content & jobs', color: 'from-purple-500 to-purple-600' },
  { id: 'compliance_officer', label: 'Compliance Officer', description: 'Audit & compliance', color: 'from-orange-500 to-orange-600' },
  { id: 'recruiter', label: 'Recruiter', description: 'Job posting', color: 'from-indigo-500 to-indigo-600' },
  { id: 'university_verifier', label: 'University Verifier', description: 'Education verification', color: 'from-sky-500 to-sky-600' },
  { id: 'candidate', label: 'Candidate', description: 'Standard user', color: 'from-gray-500 to-gray-600' },
]

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [roleSelection, setRoleSelection] = useState<UserRole | ''>('')
  const [roleReason, setRoleReason] = useState('')
  const [creditAmount, setCreditAmount] = useState(1)
  const [creditReason, setCreditReason] = useState('')
  const [statusReason, setStatusReason] = useState('')
  const [statusConfirmed, setStatusConfirmed] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [impersonating, setImpersonating] = useState(false)
  const [showPlanSelection, setShowPlanSelection] = useState(false)
  const [availablePlans, setAvailablePlans] = useState<any[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const limit = 20

  const fetchPlans = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch('http://127.0.0.1:8000/api/v1/subscriptions/plans', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        const plans = await response.json()
        setAvailablePlans(plans)
      }
    } catch (err) {
      console.error('Error fetching plans:', err)
    }
  }

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const token = getAuthToken()
      if (!token) return

      const params = new URLSearchParams({
        skip: (page * limit).toString(),
        limit: limit.toString(),
      })

      if (searchQuery) params.append('search', searchQuery)
      if (filterType === 'admin') params.append('admin_only', 'true')
      if (filterType === 'active') params.append('is_active', 'true')
      if (filterType === 'inactive') params.append('is_active', 'false')

      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/admin/users?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) throw new Error('Failed to fetch users')

      const result = await response.json()
      setUsers(result.data.users)
      setTotal(result.data.total)
      if (showUserModal && selectedUser) {
        const updatedUser = result.data.users.find((user: User) => user.id === selectedUser.id)
        if (updatedUser) {
          setSelectedUser(updatedUser)
        }
      }
      setIsLoading(false)
    } catch (err) {
      console.error('Error fetching users:', err)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [page, searchQuery, filterType])

  const toggleActiveStatus = async (userId: number, isActive: boolean, reason: string) => {
    if (!reason.trim()) {
      alert('Reason is required')
      return
    }

    try {
      setActionLoading(true)
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/admin/users/${userId}/active-status?is_active=${isActive}&reason=${encodeURIComponent(reason)}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) throw new Error('Failed to update active status')

      await fetchUsers()
      setStatusReason('')
      setStatusConfirmed(false)
    } catch (err) {
      console.error('Error updating active status:', err)
      alert('Failed to update active status')
    } finally {
      setActionLoading(false)
    }
  }

  const deleteUser = async (userId: number, reason: string) => {
    if (!reason.trim()) {
      alert('Reason is required')
      return
    }

    try {
      setActionLoading(true)
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/admin/users/${userId}?reason=${encodeURIComponent(reason)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) throw new Error('Failed to delete user')

      await fetchUsers()
      closeUserModal()
    } catch (err) {
      console.error('Error deleting user:', err)
      alert('Failed to delete user')
    } finally {
      setActionLoading(false)
    }
  }

  const openUserModal = (user: User) => {
    setSelectedUser(user)
    setRoleSelection(user.role || '')
    setRoleReason('')
    setCreditAmount(1)
    setCreditReason('')
    setStatusReason('')
    setStatusConfirmed(false)
    setDeleteReason('')
    setDeleteConfirmText('')
    setShowUserModal(true)
  }

  const closeUserModal = () => {
    setShowUserModal(false)
    setSelectedUser(null)
    setRoleSelection('')
    setRoleReason('')
    setCreditAmount(1)
    setCreditReason('')
    setStatusReason('')
    setStatusConfirmed(false)
    setDeleteReason('')
    setDeleteConfirmText('')
  }

  const updateUserRole = async () => {
    if (!selectedUser || !roleSelection || !roleReason.trim()) {
      alert('Role and reason are required')
      return
    }

    try {
      setActionLoading(true)
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/admin/users/${selectedUser.id}/role`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            new_role: roleSelection,
            reason: roleReason,
          }),
        }
      )

      if (!response.ok) throw new Error('Failed to update role')

      await fetchUsers()
      const updatedUser = { ...selectedUser, role: roleSelection }
      setSelectedUser(updatedUser)
    } catch (err) {
      console.error('Error updating role:', err)
      alert('Failed to update role')
    } finally {
      setActionLoading(false)
    }
  }

  const adjustCredits = async () => {
    if (!selectedUser || creditAmount < 1 || !creditReason.trim()) {
      alert('Provide a valid amount and reason')
      return
    }

    try {
      setActionLoading(true)
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(
        'http://127.0.0.1:8000/api/v1/admin/users/credit',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: selectedUser.id,
            amount: creditAmount,
            reason: creditReason,
          }),
        }
      )

      if (!response.ok) throw new Error('Failed to adjust credits')

      setCreditReason('')
      await fetchUsers()
      alert('Credits updated successfully')
    } catch (err) {
      console.error('Error adjusting credits:', err)
      alert('Failed to adjust credits')
    } finally {
      setActionLoading(false)
    }
  }

  const impersonateUser = async () => {
    if (!selectedUser) return

    try {
      setImpersonating(true)
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/admin/users/${selectedUser.id}/impersonate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) throw new Error('Failed to impersonate user')

      const result = await response.json()
      const impersonationToken = result.data?.token
      if (impersonationToken && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(impersonationToken)
      }
      alert('Impersonation token copied to clipboard')
    } catch (err) {
      console.error('Error impersonating user:', err)
      alert('Failed to impersonate user')
    } finally {
      setImpersonating(false)
    }
  }

  const handleSubscriptionAction = async (userId: number, action: 'cancel' | 'extend' | 'assign') => {
    if (!selectedUser) return

    // Show plan selection modal for assign action
    if (action === 'assign') {
      setShowPlanSelection(true)
      return
    }

    try {
      setActionLoading(true)
      const token = getAuthToken()
      if (!token) return

      let endpoint = ''
      let method = 'PATCH'
      let body: any = {}

      if (action === 'cancel') {
        endpoint = `http://127.0.0.1:8000/api/v1/admin/users/${userId}/subscription`
        body = { action: 'cancel' }
      } else if (action === 'extend') {
        endpoint = `http://127.0.0.1:8000/api/v1/admin/users/${userId}/subscription`
        body = { action: 'extend', days: 30 }
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to update subscription')

      await fetchUsers()
      alert(`Subscription ${action}ed successfully`)
      closeUserModal()
    } catch (err) {
      console.error('Error updating subscription:', err)
      alert('Failed to update subscription')
    } finally {
      setActionLoading(false)
    }
  }

  const confirmPlanAssignment = async () => {
    if (!selectedUser || !selectedPlanId) {
      alert('Please select a plan')
      return
    }

    try {
      setActionLoading(true)
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/admin/users/${selectedUser.id}/subscription`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'assign', plan_id: selectedPlanId }),
        }
      )

      if (!response.ok) throw new Error('Failed to assign plan')

      await fetchUsers()
      alert('Plan assigned successfully')
      setShowPlanSelection(false)
      setSelectedPlanId(null)
      closeUserModal()
    } catch (err) {
      console.error('Error assigning plan:', err)
      alert('Failed to assign plan')
    } finally {
      setActionLoading(false)
    }
  }

  const getRoleColor = (role?: UserRole) => {
    const roleObj = ROLES.find(r => r.id === role)
    return roleObj?.color || 'from-gray-500 to-gray-600'
  }

  const getRoleLabel = (role?: UserRole) => {
    const roleObj = ROLES.find(r => r.id === role)
    return roleObj?.label || 'Candidate'
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-brand-text mb-1">User Management</h1>
        <p className="text-sm text-brand-text-muted">Manage user accounts, roles, and permissions</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(0)
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-brand-dark-border text-sm text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-brand-dark-border">
        {(['all', 'admin', 'active', 'inactive'] as FilterType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setFilterType(tab)
              setPage(0)
            }}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 ${
              filterType === tab
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-text-muted hover:text-brand-text'
            }`}
          >
            {tab === 'all' && `All (${total})`}
            {tab === 'admin' && 'Admins'}
            {tab === 'active' && 'Active'}
            {tab === 'inactive' && 'Inactive'}
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="card-dark overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-dark-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-text">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-text">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-text">Subscription Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-text">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-text">Last Login</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-brand-text">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-dark-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-brand-text-muted">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-brand-text-muted">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => openUserModal(user)}
                    className="hover:bg-brand-dark-border/50 transition cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-brand-text truncate">{user.full_name}</p>
                        <p className="text-xs text-brand-text-muted truncate">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium text-white bg-gradient-to-r ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.subscription ? (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.subscription.plan_type === 'premium' 
                            ? 'bg-purple-500/20 text-purple-400'
                            : user.subscription.plan_type === 'pay_as_you_go'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {user.subscription.plan_name}
                        </span>
                      ) : (
                        <span className="text-xs text-brand-text-muted">No plan</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.is_active
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {user.mfa_enabled && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-violet-500/20 text-violet-400 flex items-center gap-1">
                            <Lock size={12} />
                            MFA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-text-muted">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric',
                        hour: '2-digit', 
                        minute: '2-digit'
                      }) : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-text-muted">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-brand-dark-border">
          <div className="text-xs text-brand-text-muted">
            Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} users
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg bg-brand-dark-border hover:bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed text-brand-text transition"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-brand-text px-3">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg bg-brand-dark-border hover:bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed text-brand-text transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* User Actions Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeUserModal}>
          <div
            className="bg-brand-dark-card border border-brand-dark-border rounded-lg max-w-4xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-brand-text">{selectedUser.full_name}</h2>
                <p className="text-xs text-brand-text-muted">{selectedUser.email}</p>
              </div>
              <button
                onClick={closeUserModal}
                className="px-3 py-1.5 rounded-lg bg-brand-dark-border hover:bg-brand-dark-border/80 text-xs text-brand-text"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-brand-dark-border">
                  <h3 className="text-xs font-semibold text-brand-text mb-3 uppercase tracking-wider">Account</h3>
                  <div className="space-y-2 text-xs text-brand-text-muted">
                    {selectedUser.location && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        <span>{selectedUser.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span>Joined {new Date(selectedUser.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <LogIn size={14} />
                      <span>
                        Last login {selectedUser.last_login_at ? new Date(selectedUser.last_login_at).toLocaleString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit', 
                          minute: '2-digit'
                        }) : 'Never'}
                      </span>
                    </div>
                    {selectedUser.mfa_enabled && (
                      <div className="flex items-center gap-2 text-violet-300">
                        <Lock size={14} />
                        <span>MFA Enabled</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-brand-dark-border">
                  <h3 className="text-xs font-semibold text-brand-text mb-3 uppercase tracking-wider">Role Assignment</h3>
                  <div className="space-y-3">
                    <select
                      value={roleSelection}
                      onChange={(e) => setRoleSelection(e.target.value as UserRole)}
                      className="w-full px-3 py-2 rounded-lg bg-brand-dark-card text-brand-text text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      <option value="">Select role</option>
                      {ROLES.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      rows={2}
                      value={roleReason}
                      onChange={(e) => setRoleReason(e.target.value)}
                      placeholder="Reason for role change"
                      className="w-full px-3 py-2 rounded-lg bg-brand-dark-card text-brand-text text-xs placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <button
                      onClick={updateUserRole}
                      disabled={actionLoading || roleSelection === selectedUser.role || !roleReason.trim()}
                      className="w-full px-3 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold disabled:opacity-50"
                    >
                      Update Role
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-brand-dark-border">
                  <h3 className="text-xs font-semibold text-brand-text mb-3 uppercase tracking-wider">Subscription</h3>
                  <div className="space-y-3">
                    {selectedUser.subscription ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-brand-text-muted">Plan:</span>
                          <span className={`px-2 py-1 rounded font-medium ${
                            selectedUser.subscription.plan_type === 'premium' 
                              ? 'bg-purple-500/20 text-purple-400'
                              : selectedUser.subscription.plan_type === 'pay_as_you_go'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {selectedUser.subscription.plan_name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-brand-text-muted">Status:</span>
                          <span className={`px-2 py-1 rounded font-medium ${
                            selectedUser.subscription.status === 'active' 
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : selectedUser.subscription.status === 'cancelled'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {selectedUser.subscription.status}
                          </span>
                        </div>
                        {selectedUser.subscription.current_period_end && (
                          <div className="flex items-center justify-between">
                            <span className="text-brand-text-muted">Expires:</span>
                            <span className="text-brand-text">
                              {new Date(selectedUser.subscription.current_period_end).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-brand-text-muted">Auto-renew:</span>
                          <span className={selectedUser.subscription.auto_renew ? 'text-emerald-400' : 'text-red-400'}>
                            {selectedUser.subscription.auto_renew ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-brand-dark-card space-y-2">
                          <button
                            onClick={() => handleSubscriptionAction(selectedUser.id, 'cancel')}
                            disabled={actionLoading || selectedUser.subscription.status === 'cancelled'}
                            className="w-full px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold disabled:opacity-50 transition"
                          >
                            Cancel Subscription
                          </button>
                          <button
                            onClick={() => handleSubscriptionAction(selectedUser.id, 'extend')}
                            disabled={actionLoading}
                            className="w-full px-3 py-2 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-semibold disabled:opacity-50 transition"
                          >
                            Extend by 30 Days
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-xs text-brand-text-muted mb-3">No active subscription</p>
                        <button
                          onClick={() => handleSubscriptionAction(selectedUser.id, 'assign')}
                          disabled={actionLoading}
                          className="px-3 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold disabled:opacity-50"
                        >
                          Assign Plan
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-brand-dark-border">
                  <h3 className="text-xs font-semibold text-brand-text mb-3 uppercase tracking-wider">Admin Actions</h3>
                  <div className="grid grid-cols-1 gap-2">
                    <textarea
                      rows={2}
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder="Reason for status change"
                      className="w-full px-3 py-2 rounded-lg bg-brand-dark-card text-brand-text text-xs placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <label className="flex items-center gap-2 text-xs text-brand-text-muted">
                      <input
                        type="checkbox"
                        checked={statusConfirmed}
                        onChange={(e) => setStatusConfirmed(e.target.checked)}
                        className="rounded border-brand-dark-card bg-brand-dark-card text-brand-primary focus:ring-brand-primary"
                      />
                      I confirm this status change
                    </label>
                    <button
                      onClick={() => toggleActiveStatus(selectedUser.id, !selectedUser.is_active, statusReason)}
                      disabled={actionLoading || !statusConfirmed || !statusReason.trim()}
                      className="px-3 py-2 rounded-lg bg-brand-dark-card hover:bg-brand-primary/20 text-brand-text text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {selectedUser.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                      {selectedUser.is_active ? 'Deactivate Account' : 'Activate Account'}
                    </button>
                    <button
                      onClick={impersonateUser}
                      disabled={impersonating}
                      className="px-3 py-2 rounded-lg bg-brand-dark-card hover:bg-brand-primary/20 text-brand-text text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Eye size={14} />
                      {impersonating ? 'Generating Token...' : 'Impersonate (Read-only)'}
                    </button>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE to confirm"
                      className="w-full px-3 py-2 rounded-lg bg-brand-dark-card text-brand-text text-xs placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-error"
                    />
                    <textarea
                      rows={2}
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="Reason for deletion"
                      className="w-full px-3 py-2 rounded-lg bg-brand-dark-card text-brand-text text-xs placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-error"
                    />
                    <button
                      onClick={() => deleteUser(selectedUser.id, deleteReason)}
                      disabled={actionLoading || deleteConfirmText !== 'DELETE' || !deleteReason.trim()}
                      className="px-3 py-2 rounded-lg bg-brand-error/10 hover:bg-brand-error/20 text-brand-error text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      Delete User
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-brand-dark-border">
                  <h3 className="text-xs font-semibold text-brand-text mb-3 uppercase tracking-wider">Credit Adjustment</h3>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(Number(e.target.value))}
                        className="w-24 px-3 py-2 rounded-lg bg-brand-dark-card text-brand-text text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                      <input
                        type="text"
                        value={creditReason}
                        onChange={(e) => setCreditReason(e.target.value)}
                        placeholder="Reason for adjustment"
                        className="flex-1 px-3 py-2 rounded-lg bg-brand-dark-card text-brand-text text-xs placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>
                    <button
                      onClick={adjustCredits}
                      disabled={actionLoading || !creditReason.trim()}
                      className="w-full px-3 py-2 rounded-lg bg-brand-primary/90 hover:bg-brand-primary text-white text-xs font-semibold disabled:opacity-50"
                    >
                      Add Credits
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Selection Modal */}
      {showPlanSelection && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowPlanSelection(false)}>
          <div
            className="bg-brand-dark-card border border-brand-dark-border rounded-lg max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-brand-text">Select Subscription Plan</h2>
                <p className="text-xs text-brand-text-muted">Choose a plan to assign to {selectedUser?.full_name}</p>
              </div>
              <button
                onClick={() => {
                  setShowPlanSelection(false)
                  setSelectedPlanId(null)
                }}
                className="px-3 py-1.5 rounded-lg bg-brand-dark-border hover:bg-brand-dark-border/80 text-xs text-brand-text"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {availablePlans.length === 0 ? (
                <p className="text-sm text-brand-text-muted text-center py-4">No plans available</p>
              ) : (
                availablePlans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                      selectedPlanId === plan.id
                        ? 'border-brand-primary bg-brand-primary/10'
                        : 'border-brand-dark-border hover:border-brand-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-semibold text-brand-text">{plan.name}</h3>
                        <p className="text-xs text-brand-text-muted">{plan.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-brand-primary">
                          {plan.price === 0 ? 'Free' : `KES ${plan.price.toLocaleString()}`}
                        </p>
                        <p className="text-xs text-brand-text-muted">
                          {plan.period === 'monthly' ? '/month' : plan.period === 'annual' ? '/year' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {plan.features && (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(plan.features).slice(0, 3).map(([key, value]: [string, any]) => (
                            <span key={key} className="text-xs px-2 py-1 rounded bg-brand-dark-border text-brand-text-muted">
                              {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={confirmPlanAssignment}
              disabled={actionLoading || !selectedPlanId}
              className="w-full px-4 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-primary-dark text-white text-sm font-semibold disabled:opacity-50 transition"
            >
              {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
