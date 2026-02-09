'use client'

import { useEffect, useState } from 'react'
import { Key, Copy, Eye, EyeOff, Trash2, Plus, Check, AlertCircle, RefreshCw, Settings, Clock, Globe, TrendingUp, Zap, DollarSign, Activity, X } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { getAuthToken } from '@/lib/auth'

interface APIKey {
  id: string
  name: string
  key: string
  masked_key: string
  model_type: string
  provider: string
  status: 'active' | 'inactive' | 'expired'
  created_at: string
  last_used?: string
  requests_count: number
  monthly_cost: number
  rate_limit: number
  tokens_used: number
  cost_this_month: number
}

interface APIStats {
  daily_requests: Array<{ date: string; count: number }>
  hourly_distribution: Array<{ hour: string; count: number }>
  token_breakdown: Array<{ type: string; tokens: number }>
}

export default function APIKeysPage() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null)
  const [selectedKeyStats, setSelectedKeyStats] = useState<APIStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    model_type: '',
    provider: ''
  })

  useEffect(() => {
    // Mock data for demonstration
    const mockKeys: APIKey[] = [
      {
        id: '1',
        name: 'Gemini Flash Production',
        key: 'AIzaSyDEHYW84Q8rx61CDnpEAkkyGBQFRLsgAF8',
        masked_key: 'AIzaSy...F8',
        model_type: 'gemini-1.5-flash',
        provider: 'Google Gemini',
        status: 'active',
        created_at: '2025-12-15',
        last_used: '2 minutes ago',
        requests_count: 45230,
        monthly_cost: 2.50,
        rate_limit: 1000,
        tokens_used: 156230,
        cost_this_month: 1.85
      },
      {
        id: '2',
        name: 'Gemini Pro Drafting',
        key: 'AIzaSyXYZ123ABC456DEF789GHI',
        masked_key: 'AIzaSy...HI',
        model_type: 'gemini-1.5-pro',
        provider: 'Google Gemini',
        status: 'active',
        created_at: '2025-11-20',
        last_used: '1 hour ago',
        requests_count: 12850,
        monthly_cost: 8.75,
        rate_limit: 500,
        tokens_used: 98540,
        cost_this_month: 6.20
      },
      {
        id: '3',
        name: 'Claude 3.5 Sonnet',
        key: 'sk_live_xyz789abc123def456',
        masked_key: 'sk_live_...456',
        model_type: 'claude-3.5-sonnet',
        provider: 'Anthropic Claude',
        status: 'active',
        created_at: '2025-10-01',
        last_used: '12 hours ago',
        requests_count: 8320,
        monthly_cost: 12.50,
        rate_limit: 300,
        tokens_used: 67890,
        cost_this_month: 9.15
      }
    ]
    setApiKeys(mockKeys)
    setLoading(false)
  }, [])

  useEffect(() => {
    // Load stats when a key is selected
    if (selectedKeyId) {
      const mockStats: APIStats = {
        daily_requests: [
          { date: 'Mon', count: 1250 },
          { date: 'Tue', count: 1840 },
          { date: 'Wed', count: 2100 },
          { date: 'Thu', count: 1920 },
          { date: 'Fri', count: 2450 },
          { date: 'Sat', count: 890 },
          { date: 'Sun', count: 1280 }
        ],
        hourly_distribution: [
          { hour: '00:00', count: 45 },
          { hour: '06:00', count: 120 },
          { hour: '12:00', count: 380 },
          { hour: '18:00', count: 450 },
          { hour: '23:00', count: 210 }
        ],
        token_breakdown: [
          { type: 'Input', tokens: 98540 },
          { type: 'Output', tokens: 57690 }
        ]
      }
      setSelectedKeyStats(mockStats)
    }
  }, [selectedKeyId])

  const handleCopyKey = (key: string, keyId: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(keyId)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }))
  }

  const handleAddKey = async () => {
    if (!formData.name || !formData.key || !formData.model_type) {
      alert('Please fill in all fields')
      return
    }

    const newKey: APIKey = {
      id: Date.now().toString(),
      name: formData.name,
      key: formData.key,
      masked_key: formData.key.slice(0, 8) + '...' + formData.key.slice(-4),
      model_type: formData.model_type,
      provider: formData.provider || 'Unknown',
      status: 'active',
      created_at: new Date().toISOString().split('T')[0],
      requests_count: 0,
      monthly_cost: 0,
      rate_limit: 1000,
      tokens_used: 0,
      cost_this_month: 0
    }

    setApiKeys([...apiKeys, newKey])
    setFormData({ name: '', key: '', model_type: '', provider: '' })
    setShowAddForm(false)
    alert('API key added successfully')
  }

  const handleDeleteKey = (keyId: string) => {
    if (window.confirm('Are you sure you want to delete this API key?')) {
      setApiKeys(apiKeys.filter(k => k.id !== keyId))
      if (selectedKeyId === keyId) {
        setSelectedKeyId(null)
        setSelectedKeyStats(null)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      case 'inactive':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30'
      case 'expired':
        return 'bg-red-500/10 text-red-400 border-red-500/30'
      default:
        return 'bg-brand-dark-border'
    }
  }

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'Google Gemini':
        return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', emoji: '🔵' }
      case 'Anthropic Claude':
        return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', emoji: '🟠' }
      case 'OpenAI':
        return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', emoji: '🟣' }
      default:
        return { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', emoji: '⚪' }
    }
  }

  const selectedKey = apiKeys.find(k => k.id === selectedKeyId)
  const providerColor = selectedKey ? getProviderColor(selectedKey.provider) : null

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
          <p className="text-brand-text-muted">Loading API keys...</p>
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
            <h1 className="text-3xl font-display font-bold text-brand-text mb-1">API Keys</h1>
            <p className="text-sm text-brand-text-muted">
              Manage authentication keys for LLM providers and monitor usage metrics
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`px-5 py-2.5 rounded-lg font-semibold transition flex items-center gap-2 text-sm ${
              showAddForm
                ? 'bg-brand-dark-border text-brand-text hover:bg-brand-dark-border/70'
                : 'bg-gradient-to-r from-brand-primary to-brand-accent text-white hover:opacity-90'
            }`}
          >
            {showAddForm ? <X size={18} /> : <Plus size={18} />}
            {showAddForm ? 'Cancel' : 'Add API Key'}
          </button>
        </div>

        {/* Add API Key Form */}
        {showAddForm && (
          <div className="card-dark p-6 mb-6 border-brand-primary/30">
            <h2 className="text-lg font-semibold text-brand-text mb-5">Add New API Key</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-brand-text mb-2">Key Name</label>
                <input
                  type="text"
                  placeholder="e.g., Gemini Flash Production"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text mb-2">Provider</label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="">Select Provider</option>
                  <option value="Google Gemini">Google Gemini</option>
                  <option value="Anthropic Claude">Anthropic Claude</option>
                  <option value="OpenAI">OpenAI</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text mb-2">Model Type</label>
                <input
                  type="text"
                  placeholder="e.g., gemini-1.5-flash"
                  value={formData.model_type}
                  onChange={(e) => setFormData({ ...formData, model_type: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text mb-2">API Key</label>
                <input
                  type="password"
                  placeholder="Paste your API key here"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>

            <button
              onClick={handleAddKey}
              className="w-full px-4 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-brand-primary-dark transition"
            >
              Add API Key
            </button>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* API Keys List */}
          <div className="lg:col-span-1">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <Key className="text-brand-primary" size={18} />
                <h2 className="text-base font-semibold text-brand-text">
                  Active Keys ({apiKeys.filter(k => k.status === 'active').length})
                </h2>
              </div>

              {apiKeys.map((apiKey) => {
                const isSelected = selectedKeyId === apiKey.id
                const colors = getProviderColor(apiKey.provider)

                return (
                  <div
                    key={apiKey.id}
                    onClick={() => setSelectedKeyId(apiKey.id)}
                    className={`card-dark p-4 cursor-pointer transition ${
                      isSelected
                        ? 'bg-brand-dark-border border-brand-primary ring-2 ring-brand-primary/50'
                        : 'hover:border-brand-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-2 flex-1">
                        <span className="text-xl">{colors.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-brand-text truncate">{apiKey.name}</h3>
                          <p className="text-xs text-brand-text-muted">{apiKey.provider}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(apiKey.status)}`}>
                        {apiKey.status.charAt(0).toUpperCase() + apiKey.status.slice(1)}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-brand-text-muted">Model</span>
                        <span className="text-brand-text font-mono">{apiKey.model_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-brand-text-muted">Requests</span>
                        <span className="text-brand-text font-semibold">{(apiKey.requests_count / 1000).toFixed(1)}K</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-brand-text-muted">This Month</span>
                        <span className="text-brand-text font-semibold text-emerald-400">${apiKey.cost_this_month.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {apiKeys.length === 0 && !showAddForm && (
                <div className="card-dark p-8 text-center">
                  <Key className="text-brand-text-muted mx-auto mb-3 opacity-50" size={32} />
                  <p className="text-sm text-brand-text-muted">No API keys added yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Stats View */}
          <div className="lg:col-span-2">
            {selectedKey && selectedKeyStats ? (
              <div className="space-y-4">
                {/* Key Details Header */}
                <div className={`card-dark p-6 ${providerColor?.bg} border-2 ${providerColor?.border}`}>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{providerColor?.emoji}</span>
                        <div>
                          <h3 className="text-2xl font-bold text-brand-text">{selectedKey.name}</h3>
                          <p className={`text-sm ${providerColor?.text}`}>{selectedKey.provider}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteKey(selectedKey.id)}
                      className="p-2 text-brand-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  {/* Key Display & Actions */}
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-brand-dark-border/50 mb-4">
                    <Key className="text-brand-text-muted" size={16} />
                    <code className="text-xs font-mono text-brand-text flex-1">
                      {visibleKeys[selectedKey.id] ? selectedKey.key : selectedKey.masked_key}
                    </code>
                    <button
                      onClick={() => toggleKeyVisibility(selectedKey.id)}
                      className="p-1.5 text-brand-text-muted hover:text-brand-text transition"
                    >
                      {visibleKeys[selectedKey.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => handleCopyKey(selectedKey.key, selectedKey.id)}
                      className="p-1.5 text-brand-text-muted hover:text-brand-text transition"
                    >
                      {copiedKey === selectedKey.id ? (
                        <Check size={16} className="text-emerald-400" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-brand-dark-border/50">
                      <p className="text-xs text-brand-text-muted mb-1">Model</p>
                      <p className="text-sm text-brand-text font-mono">{selectedKey.model_type}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-brand-dark-border/50">
                      <p className="text-xs text-brand-text-muted mb-1">Created</p>
                      <p className="text-sm text-brand-text">{selectedKey.created_at}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-brand-dark-border/50">
                      <p className="text-xs text-brand-text-muted mb-1">Last Used</p>
                      <p className="text-sm text-brand-text">{selectedKey.last_used || 'Never'}</p>
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="card-dark p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="text-cyan-400" size={16} />
                      <p className="text-xs text-brand-text-muted uppercase tracking-wider">Total Requests</p>
                    </div>
                    <p className="text-2xl font-bold text-brand-text">{(selectedKey.requests_count / 1000).toFixed(1)}K</p>
                    <p className="text-xs text-cyan-400 mt-2">↑ {Math.floor(selectedKey.requests_count * 0.15).toLocaleString()} this week</p>
                  </div>

                  <div className="card-dark p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="text-emerald-400" size={16} />
                      <p className="text-xs text-brand-text-muted uppercase tracking-wider">Cost This Month</p>
                    </div>
                    <p className="text-2xl font-bold text-brand-text">${selectedKey.cost_this_month.toFixed(2)}</p>
                    <p className="text-xs text-emerald-400 mt-2">Limit: ${selectedKey.monthly_cost.toFixed(2)}</p>
                  </div>

                  <div className="card-dark p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="text-amber-400" size={16} />
                      <p className="text-xs text-brand-text-muted uppercase tracking-wider">Tokens Used</p>
                    </div>
                    <p className="text-2xl font-bold text-brand-text">{(selectedKey.tokens_used / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-amber-400 mt-2">Input + Output</p>
                  </div>
                </div>

                {/* Charts */}
                <div className="card-dark p-5">
                  <h4 className="text-sm font-semibold text-brand-text mb-4 flex items-center gap-2">
                    <TrendingUp className="text-blue-400" size={16} />
                    Daily Request Trend (Last 7 Days)
                  </h4>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={selectedKeyStats.daily_requests}>
                      <defs>
                        <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                      <XAxis dataKey="date" stroke="#718096" style={{ fontSize: '11px' }} />
                      <YAxis stroke="#718096" style={{ fontSize: '11px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a2e',
                          border: '1px solid #2d3748',
                          borderRadius: '0.5rem',
                          fontSize: '12px'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#colorRequests)"
                        animationDuration={1000}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Token Breakdown */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="card-dark p-5">
                    <h4 className="text-sm font-semibold text-brand-text mb-4">Token Distribution</h4>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={selectedKeyStats.token_breakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                        <XAxis dataKey="type" stroke="#718096" style={{ fontSize: '11px' }} />
                        <YAxis stroke="#718096" style={{ fontSize: '11px' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1a1a2e',
                            border: '1px solid #2d3748',
                            borderRadius: '0.5rem',
                            fontSize: '12px'
                          }}
                        />
                        <Bar dataKey="tokens" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="card-dark p-5">
                    <h4 className="text-sm font-semibold text-brand-text mb-4">Rate Limit</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-brand-text-muted">Current Usage</span>
                          <span className="text-sm text-brand-text font-semibold">{Math.round((selectedKey.requests_count / selectedKey.rate_limit) * 100)}%</span>
                        </div>
                        <div className="w-full bg-brand-dark-border rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((selectedKey.requests_count / selectedKey.rate_limit) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-brand-dark-border">
                        <p className="text-xs text-brand-text-muted mb-1">Hourly Limit</p>
                        <p className="text-lg font-bold text-brand-text">{selectedKey.rate_limit}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-dark p-12 text-center">
                <Key className="text-brand-text-muted mx-auto mb-4 opacity-30" size={48} />
                <h3 className="text-lg font-semibold text-brand-text mb-2">Select an API Key</h3>
                <p className="text-brand-text-muted">
                  Choose a key from the list to view detailed usage statistics and metrics
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Hybrid Strategy Info */}
        {apiKeys.length > 0 && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card-dark p-5 bg-blue-500/5 border-blue-500/30">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Globe className="text-blue-400" size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-blue-300 mb-1">Gemini Flash</h4>
                  <p className="text-xs text-blue-200/80">Extraction & OCR - Best price-performance</p>
                </div>
              </div>
            </div>

            <div className="card-dark p-5 bg-purple-500/5 border-purple-500/30">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Settings className="text-purple-400" size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-purple-300 mb-1">Gemini Pro & Claude</h4>
                  <p className="text-xs text-purple-200/80">CV drafting - Higher nuance accuracy</p>
                </div>
              </div>
            </div>

            <div className="card-dark p-5 bg-orange-500/5 border-orange-500/30">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Zap className="text-orange-400" size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-orange-300 mb-1">GPT-4o Mini</h4>
                  <p className="text-xs text-orange-200/80">Support chat - Low latency</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

