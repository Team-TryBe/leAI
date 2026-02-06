'use client'

import { AdminLayout } from '@/components/admin/AdminLayout'
import { useEffect, useState } from 'react'
import { Search, Shield, ShieldOff, UserX, UserCheck, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { getAuthToken } from '@/lib/auth'

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
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAdmin, setFilterAdmin] = useState<boolean | null>(null)
  const [filterActive, setFilterActive] = useState<boolean | null>(null)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const limit = 20

  const fetchUsers = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      const params = new URLSearchParams({
        skip: (page * limit).toString(),
        limit: limit.toString(),
      })

      if (searchQuery) params.append('search', searchQuery)
      if (filterAdmin !== null) params.append('admin_only', filterAdmin.toString())
      if (filterActive !== null) params.append('is_active', filterActive.toString())

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
      setIsLoading(false)
    } catch (err) {
      console.error('Error fetching users:', err)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, searchQuery, filterAdmin, filterActive])

  const toggleAdminStatus = async (userId: number, makeAdmin: boolean) => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/admin/users/${userId}/admin-status?make_admin=${makeAdmin}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) throw new Error('Failed to update admin status')

      fetchUsers()
    } catch (err) {
      console.error('Error updating admin status:', err)
      alert('Failed to update admin status')
    }
  }

  const toggleActiveStatus = async (userId: number, isActive: boolean) => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/admin/users/${userId}/active-status?is_active=${isActive}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) throw new Error('Failed to update active status')

      fetchUsers()
    } catch (err) {
      console.error('Error updating active status:', err)
      alert('Failed to update active status')
    }
  }

  const deleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/admin/users/${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) throw new Error('Failed to delete user')

      fetchUsers()
    } catch (err) {
      console.error('Error deleting user:', err)
      alert('Failed to delete user')
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-brand-text mb-2">User Management</h1>
        <p className="text-brand-text-muted">Manage user accounts and permissions</p>
      </div>

      {/* Filters & Search */}
      <div className="card-dark p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={20} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(0)
                }}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-brand-dark-border text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
          </div>

          {/* Admin Filter */}
          <select
            value={filterAdmin === null ? 'all' : filterAdmin.toString()}
            onChange={(e) => {
              const value = e.target.value
              setFilterAdmin(value === 'all' ? null : value === 'true')
              setPage(0)
            }}
            className="px-4 py-2 rounded-lg bg-brand-dark-border text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="all">All Users</option>
            <option value="true">Admins Only</option>
            <option value="false">Non-Admins</option>
          </select>

          {/* Active Filter */}
          <select
            value={filterActive === null ? 'all' : filterActive.toString()}
            onChange={(e) => {
              const value = e.target.value
              setFilterActive(value === 'all' ? null : value === 'true')
              setPage(0)
            }}
            className="px-4 py-2 rounded-lg bg-brand-dark-border text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="all">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-brand-dark-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-text">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-text">Location</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-text">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-text">Role</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-text">Joined</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-brand-text">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-dark-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-brand-text-muted">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-brand-text-muted">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-brand-dark-border/50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-brand-text font-medium">{user.full_name}</p>
                        <p className="text-brand-text-muted text-sm">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-brand-text-muted text-sm">
                        {user.location || 'Not specified'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_admin
                            ? 'bg-brand-primary/20 text-brand-primary'
                            : 'bg-brand-dark-border text-brand-text-muted'
                        }`}
                      >
                        {user.is_admin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-brand-text-muted text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle Active */}
                        <button
                          onClick={() => toggleActiveStatus(user.id, !user.is_active)}
                          className="p-2 rounded-lg hover:bg-brand-dark-border text-brand-text-muted hover:text-brand-text transition"
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {user.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                        </button>

                        {/* Toggle Admin */}
                        <button
                          onClick={() => toggleAdminStatus(user.id, !user.is_admin)}
                          className="p-2 rounded-lg hover:bg-brand-dark-border text-brand-text-muted hover:text-brand-primary transition"
                          title={user.is_admin ? 'Remove Admin' : 'Make Admin'}
                        >
                          {user.is_admin ? <ShieldOff size={18} /> : <Shield size={18} />}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="p-2 rounded-lg hover:bg-brand-error/20 text-brand-text-muted hover:text-brand-error transition"
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-brand-dark-border flex items-center justify-between">
            <div className="text-sm text-brand-text-muted">
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} users
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg bg-brand-dark-border hover:bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed text-brand-text transition"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-brand-text px-4">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg bg-brand-dark-border hover:bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed text-brand-text transition"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
