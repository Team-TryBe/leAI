'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, Plus, Edit2, Trash2, Check, X, RefreshCw, Loader2, Zap, ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react'
import { getAuthToken } from '@/lib/auth'

interface ProviderConfig {
  id: number
  provider_type: string
  model_name: string
  display_name?: string
  description?: string
  is_active: boolean
  is_default: boolean
  default_for_extraction: boolean
  default_for_cv_draft: boolean
  default_for_cover_letter: boolean
  default_for_validation: boolean
  daily_token_limit?: number
  monthly_token_limit?: number
  last_tested_at?: string
  last_test_success?: boolean
  created_at: string
}

interface ProviderStats {
  provider_type: string
  model_name: string
  total_calls: number
  total_tokens: number
  total_cost_usd: number
  success_rate: number
  avg_latency_ms: number
  last_7_days_calls: number
  last_30_days_calls: number
}

const PROVIDER_TYPES = ['gemini', 'openai', 'claude']
const PROVIDER_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  gemini: { label: 'Google Gemini', icon: '🔵', color: 'bg-blue-500/10 border-blue-500/30' },
  openai: { label: 'OpenAI', icon: '🟢', color: 'bg-green-500/10 border-green-500/30' },
  claude: { label: 'Anthropic Claude', icon: '🟣', color: 'bg-purple-500/10 border-purple-500/30' },
}

// Available models per provider
const AVAILABLE_MODELS: Record<string, Array<{ name: string; description: string }>> = {
  gemini: [
    { name: 'gemini-2.5-flash', description: 'Recommended - fast & affordable' },
    { name: 'gemini-2.5-pro', description: 'Best quality, slower' },
    { name: 'gemini-2.5-flash-lite', description: 'Fastest & cheapest' },
    { name: 'gemini-3-flash-preview-12-2025', description: 'Latest preview (experimental)' },
  ],
  openai: [
    { name: 'gpt-4o', description: 'Recommended - multimodal' },
    { name: 'gpt-4-turbo', description: 'High performance' },
    { name: 'gpt-3.5-turbo', description: 'Budget option' },
  ],
  claude: [
    { name: 'claude-opus', description: 'Most capable' },
    { name: 'claude-sonnet', description: 'Best balance' },
    { name: 'claude-haiku', description: 'Fast and cheap' },
  ],
}

const ITEMS_PER_PAGE = 6

export default function ProvidersPage() {
  const [configs, setConfigs] = useState<ProviderConfig[]>([])
  const [stats, setStats] = useState<ProviderStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const [formData, setFormData] = useState({
    provider_type: 'gemini',
    api_key: '',
    model_name: '',
    display_name: '',
    description: '',
    is_active: true,
    is_default: false,
    default_for_extraction: false,
    default_for_cv_draft: false,
    default_for_cover_letter: false,
    default_for_validation: false,
    daily_token_limit: '',
    monthly_token_limit: '',
  })

  useEffect(() => {
    fetchConfigs()
    fetchStats()
  }, [])

  // Auto-clear success/error messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  const totalPages = Math.ceil(configs.length / ITEMS_PER_PAGE)
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedConfigs = configs.slice(startIdx, startIdx + ITEMS_PER_PAGE)

  const fetchConfigs = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch('http://127.0.0.1:8000/api/v1/super-admin/providers/configs', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setConfigs(data.data || [])
      }
    } catch (err) {
      setError('Failed to fetch provider configurations')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch('http://127.0.0.1:8000/api/v1/super-admin/providers/usage/stats?days=30', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      const token = getAuthToken()
      const payload = {
        ...formData,
        daily_token_limit: formData.daily_token_limit ? parseInt(formData.daily_token_limit) : null,
        monthly_token_limit: formData.monthly_token_limit ? parseInt(formData.monthly_token_limit) : null,
      }

      const url = editingId 
        ? `http://127.0.0.1:8000/api/v1/super-admin/providers/configs/${editingId}`
        : 'http://127.0.0.1:8000/api/v1/super-admin/providers/configs'
      
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setSuccess(editingId ? 'Provider updated successfully' : 'Provider created successfully')
        setShowForm(false)
        setEditingId(null)
        setFormData({
          provider_type: 'gemini',
          api_key: '',
          model_name: '',
          display_name: '',
          description: '',
          is_active: true,
          is_default: false,
          default_for_extraction: false,
          default_for_cv_draft: false,
          default_for_cover_letter: false,
          default_for_validation: false,
          daily_token_limit: '',
          monthly_token_limit: '',
        })
        fetchConfigs()
      } else {
        const data = await response.json()
        setError(data.detail || 'Failed to save provider')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    }
  }

  const handleEdit = (config: ProviderConfig) => {
    setEditingId(config.id)
    setFormData({
      provider_type: config.provider_type,
      api_key: '', // Don't populate for security
      model_name: config.model_name,
      display_name: config.display_name || '',
      description: config.description || '',
      is_active: config.is_active,
      is_default: config.is_default,
      default_for_extraction: config.default_for_extraction,
      default_for_cv_draft: config.default_for_cv_draft,
      default_for_cover_letter: config.default_for_cover_letter,
      default_for_validation: config.default_for_validation,
      daily_token_limit: config.daily_token_limit?.toString() || '',
      monthly_token_limit: config.monthly_token_limit?.toString() || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure? This will permanently delete the provider configuration.')) return

    try {
      const token = getAuthToken()
      const response = await fetch(`http://127.0.0.1:8000/api/v1/super-admin/providers/configs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setSuccess('Provider deleted successfully')
        fetchConfigs()
      } else {
        setError('Failed to delete provider')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    }
  }

  const handleTest = async (id: number) => {
    try {
      const token = getAuthToken()
      const response = await fetch(`http://127.0.0.1:8000/api/v1/super-admin/providers/configs/${id}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setSuccess('✓ Provider credentials validated successfully!')
        // Refresh the configs to show updated test status
        await new Promise(resolve => setTimeout(resolve, 500))
        fetchConfigs()
      } else {
        const data = await response.json()
        setError(data.detail || 'Provider test failed - invalid credentials or API error')
      }
    } catch (err: any) {
      setError('Test failed: ' + (err.message || 'Unknown error'))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brand-text">Provider Management</h1>
          <p className="text-brand-text-muted mt-1 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Configure and manage AI provider credentials
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              provider_type: 'gemini',
              api_key: '',
              model_name: '',
              display_name: '',
              description: '',
              is_active: true,
              is_default: false,
              default_for_extraction: false,
              default_for_cv_draft: false,
              default_for_cover_letter: false,
              default_for_validation: false,
              daily_token_limit: '',
              monthly_token_limit: '',
            })
            setEditingId(null)
            setShowForm(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Add Provider
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-brand-text font-medium">Error</p>
            <p className="text-sm text-brand-text-muted mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top">
          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-400 font-bold">✓ Success</p>
            <p className="text-sm text-green-300 mt-1">{success}</p>
          </div>
        </div>
      )}

      {/* Form - Compact */}
      {showForm && (
        <div className="space-y-4">
          {/* Tip Banner */}
          <div className="p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-lg flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-brand-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-brand-text font-medium">💡 Test before adding</p>
              <p className="text-brand-text-muted text-xs mt-1">
                Unsure if a model works with your API key? Visit <Link href="/admin/model-testing" className="text-brand-primary hover:text-brand-primary-light font-semibold">Model Testing</Link> to verify before creating the provider.
              </p>
            </div>
          </div>

          <div className="bg-brand-dark-bg border border-brand-dark-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-bold text-brand-text">
            {editingId ? 'Edit Provider' : 'New Provider'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Provider Type & Model */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">Provider *</label>
                <select
                  value={formData.provider_type}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      provider_type: e.target.value,
                      model_name: AVAILABLE_MODELS[e.target.value]?.[0]?.name || ''
                    })
                  }}
                  disabled={editingId !== null}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-base text-gray-900 font-semibold placeholder-gray-600 disabled:opacity-50 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary outline-none transition"
                >
                  {PROVIDER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {PROVIDER_CONFIG[type].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">Model *</label>
                <select
                  value={formData.model_name}
                  onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-base text-gray-900 font-semibold placeholder-gray-600 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary outline-none transition"
                  required
                >
                  <option value="">Select a model...</option>
                  {AVAILABLE_MODELS[formData.provider_type]?.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  Not sure which model to use? <Link href="/admin/model-testing" className="text-brand-primary hover:underline font-semibold">Test models first →</Link>
                </p>
              </div>
            </div>

            {/* Row 2: API Key & Display Name */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">API Key *</label>
                <input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder={editingId ? 'Leave blank to keep' : 'Paste your API key'}
                  className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-base text-gray-900 font-semibold placeholder-gray-600 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary outline-none transition"
                  required={!editingId}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">Display Name</label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="e.g., GPT-4 Standard"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-base text-gray-900 font-semibold placeholder-gray-600 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary outline-none transition"
                />
              </div>
            </div>

            {/* Row 3: Limits */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">Daily Limit (tokens)</label>
                <input
                  type="number"
                  value={formData.daily_token_limit}
                  onChange={(e) => setFormData({ ...formData, daily_token_limit: e.target.value })}
                  placeholder="Leave empty for unlimited"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-base text-gray-900 font-semibold placeholder-gray-600 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wider">Monthly Limit (tokens)</label>
                <input
                  type="number"
                  value={formData.monthly_token_limit}
                  onChange={(e) => setFormData({ ...formData, monthly_token_limit: e.target.value })}
                  placeholder="Leave empty for unlimited"
                  className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-base text-gray-900 font-semibold placeholder-gray-600 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary outline-none transition"
                />
              </div>
            </div>

            {/* Status & Usage Checkboxes - Compact Grid */}
            <div className="bg-brand-darker-bg border border-brand-dark-border rounded-lg p-4 space-y-3">
              <p className="text-sm font-bold text-white uppercase tracking-wider">Configuration</p>
              <div className="grid md:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-brand-dark-bg/50 p-2 rounded transition">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-brand-dark-border bg-brand-darker-bg cursor-pointer accent-brand-primary"
                  />
                  <span className="text-sm font-bold text-white">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-brand-dark-bg/50 p-2 rounded transition">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-4 h-4 rounded border-brand-dark-border bg-brand-darker-bg cursor-pointer accent-brand-primary"
                  />
                  <span className="text-sm font-bold text-white">Default</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-brand-dark-bg/50 p-2 rounded transition">
                  <input
                    type="checkbox"
                    checked={formData.default_for_extraction}
                    onChange={(e) => setFormData({ ...formData, default_for_extraction: e.target.checked })}
                    className="w-4 h-4 rounded border-brand-dark-border bg-brand-darker-bg cursor-pointer accent-brand-primary"
                  />
                  <span className="text-sm font-bold text-white">Extraction</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-brand-dark-bg/50 p-2 rounded transition">
                  <input
                    type="checkbox"
                    checked={formData.default_for_cv_draft}
                    onChange={(e) => setFormData({ ...formData, default_for_cv_draft: e.target.checked })}
                    className="w-4 h-4 rounded border-brand-dark-border bg-brand-darker-bg cursor-pointer accent-brand-primary"
                  />
                  <span className="text-sm font-bold text-white">CV Draft</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-brand-dark-bg/50 p-2 rounded transition">
                  <input
                    type="checkbox"
                    checked={formData.default_for_cover_letter}
                    onChange={(e) => setFormData({ ...formData, default_for_cover_letter: e.target.checked })}
                    className="w-4 h-4 rounded border-brand-dark-border bg-brand-darker-bg cursor-pointer accent-brand-primary"
                  />
                  <span className="text-sm font-bold text-white">Cover Letter</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-brand-dark-bg/50 p-2 rounded transition">
                  <input
                    type="checkbox"
                    checked={formData.default_for_validation}
                    onChange={(e) => setFormData({ ...formData, default_for_validation: e.target.checked })}
                    className="w-4 h-4 rounded border-brand-dark-border bg-brand-darker-bg cursor-pointer accent-brand-primary"
                  />
                  <span className="text-sm font-bold text-white">Validation</span>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-brand-dark-border">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                }}
                className="px-4 py-2 bg-brand-dark-border hover:bg-brand-dark-border/80 text-brand-text rounded-lg font-medium transition text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition text-sm"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
        </div>
      )}

      {/* Providers Grid with Pagination */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-brand-primary animate-spin mx-auto mb-3" />
            <p className="text-brand-text-muted">Loading providers...</p>
          </div>
        </div>
      ) : configs.length === 0 ? (
        <div className="p-12 text-center bg-brand-dark-bg border border-dashed border-brand-dark-border rounded-lg">
          <Zap className="w-12 h-12 text-brand-text-muted mx-auto mb-3 opacity-40" />
          <p className="text-brand-text font-medium mb-1">No Providers Configured</p>
          <p className="text-sm text-brand-text-muted mb-4">Create your first provider to get started</p>
          <button
            onClick={() => {
              setFormData({
                provider_type: 'gemini',
                api_key: '',
                model_name: '',
                display_name: '',
                description: '',
                is_active: true,
                is_default: false,
                default_for_extraction: false,
                default_for_cv_draft: false,
                default_for_cover_letter: false,
                default_for_validation: false,
                daily_token_limit: '',
                monthly_token_limit: '',
              })
              setEditingId(null)
              setShowForm(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition"
          >
            <Plus className="w-4 h-4" />
            Add Provider
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Provider Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedConfigs.map((config) => {
              const providerConfig = PROVIDER_CONFIG[config.provider_type] || {
                label: config.provider_type,
                icon: '⚙️',
                color: 'bg-gray-500/10 border-gray-500/30',
              }
              return (
                <div
                  key={config.id}
                  className={`bg-brand-dark-bg border ${providerConfig.color} rounded-lg p-4 hover:border-brand-primary/50 transition group`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-2xl">{providerConfig.icon}</span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-brand-text truncate">
                          {config.display_name || config.model_name}
                        </h3>
                        <p className="text-xs text-brand-text-muted">{providerConfig.label}</p>
                      </div>
                    </div>
                    {config.is_active && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full flex-shrink-0">
                        Active
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-1 mb-3 pb-3 border-t border-brand-dark-border pt-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-brand-text-muted">Model</span>
                      <code className="text-brand-text bg-brand-darker-bg px-2 py-0.5 rounded text-xs font-mono">{config.model_name}</code>
                    </div>
                    {config.daily_token_limit && (
                      <div className="flex justify-between items-center">
                        <span className="text-brand-text-muted">Daily</span>
                        <span className="text-brand-text">{(config.daily_token_limit / 1000).toFixed(0)}K</span>
                      </div>
                    )}
                    {config.last_tested_at && (
                      <div className="flex justify-between items-center">
                        <span className="text-brand-text-muted">Status</span>
                        <div className="flex items-center gap-1">
                          {config.last_test_success ? (
                            <>
                              <Check className="w-3 h-3 text-green-400" />
                              <span className="text-green-400">Valid</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3 text-red-400" />
                              <span className="text-red-400">Invalid</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Usage Tags */}
                  {(config.default_for_extraction ||
                    config.default_for_cv_draft ||
                    config.default_for_cover_letter ||
                    config.default_for_validation) && (
                    <div className="flex flex-wrap gap-1 mb-3 pb-3 border-t border-brand-dark-border pt-3">
                      {config.default_for_extraction && (
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full">📊 Extract</span>
                      )}
                      {config.default_for_cv_draft && (
                        <span className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-full">📝 CV</span>
                      )}
                      {config.default_for_cover_letter && (
                        <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full">✉️ Letter</span>
                      )}
                      {config.default_for_validation && (
                        <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-full">✓ Validate</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTest(config.id)}
                      className="flex-1 px-3 py-2 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition flex items-center justify-center gap-1"
                      title="Test credentials"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Test
                    </button>
                    <button
                      onClick={() => handleEdit(config)}
                      className="flex-1 px-3 py-2 text-xs bg-brand-dark-border hover:bg-brand-dark-border/80 text-brand-text rounded-lg transition"
                    >
                      <Edit2 className="w-3 h-3 mx-auto" />
                    </button>
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="flex-1 px-3 py-2 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                    >
                      <Trash2 className="w-3 h-3 mx-auto" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-brand-dark-border hover:border-brand-primary/50 text-brand-text-muted hover:text-brand-text disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      currentPage === page
                        ? 'bg-brand-primary text-white'
                        : 'border border-brand-dark-border text-brand-text-muted hover:border-brand-primary/50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-brand-dark-border hover:border-brand-primary/50 text-brand-text-muted hover:text-brand-text disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Usage Stats */}
      {stats.length > 0 && (
        <div className="space-y-4 mt-8 pt-8 border-t border-brand-dark-border">
          <h2 className="text-xl font-bold text-brand-text">Usage Statistics (Last 30 Days)</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((stat) => {
              const config = PROVIDER_CONFIG[stat.provider_type as keyof typeof PROVIDER_CONFIG] || {
                label: stat.provider_type,
                icon: '⚙️',
                color: 'bg-gray-500/10 border-gray-500/30',
              }
              return (
                <div
                  key={`${stat.provider_type}-${stat.model_name}`}
                  className="bg-brand-dark-bg border border-brand-dark-border rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-brand-text">{config.label}</p>
                      <p className="text-xs text-brand-text-muted">{stat.model_name}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-brand-darker-bg rounded-lg p-2">
                      <p className="text-brand-text-muted mb-1">API Calls</p>
                      <p className="text-base font-bold text-brand-text">{stat.total_calls}</p>
                    </div>
                    <div className="bg-brand-darker-bg rounded-lg p-2">
                      <p className="text-brand-text-muted mb-1">Tokens</p>
                      <p className="text-base font-bold text-brand-text">{(stat.total_tokens / 1000).toFixed(0)}K</p>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                      <p className="text-brand-text-muted mb-1">Cost</p>
                      <p className="text-base font-bold text-green-400">${stat.total_cost_usd.toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
                      <p className="text-brand-text-muted mb-1">Success</p>
                      <p className="text-base font-bold text-blue-400">{stat.success_rate.toFixed(0)}%</p>
                    </div>
                  </div>
                  <div className="text-xs text-brand-text-muted mt-2 pt-2 border-t border-brand-dark-border">
                    Latency: <span className="font-medium text-brand-text">{stat.avg_latency_ms}ms</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
