'use client'

import React, { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Zap, ChevronDown, Copy } from 'lucide-react'
import axios from 'axios'
import { getAuthToken } from '@/lib/auth'

interface AvailableModel {
  name: string
  recommendation: string
  emoji: string
}

const PROVIDER_MODELS: Record<string, AvailableModel[]> = {
  gemini: [
    { name: 'gemini-2.5-flash', recommendation: 'Recommended - fast & affordable', emoji: '✓' },
    { name: 'gemini-2.5-pro', recommendation: 'Best quality, slower', emoji: '⭐' },
    { name: 'gemini-2.5-flash-lite', recommendation: 'Fastest & cheapest', emoji: '⚡' },
    { name: 'gemini-3-flash-preview-12-2025', recommendation: 'Latest preview (experimental)', emoji: '🚀' },
  ],
  openai: [
    { name: 'gpt-4o', recommendation: 'Recommended, multimodal', emoji: '✓' },
    { name: 'gpt-4-turbo', recommendation: 'Good balance of cost/performance', emoji: '⭐' },
    { name: 'gpt-3.5-turbo', recommendation: 'Budget option', emoji: '🟢' },
  ],
  claude: [
    { name: 'claude-opus', recommendation: 'Most capable', emoji: '✓' },
    { name: 'claude-sonnet', recommendation: 'Best balance', emoji: '⭐' },
    { name: 'claude-haiku', recommendation: 'Fast and cheap', emoji: '⚡' },
  ],
}

const PROVIDER_INFO = {
  gemini: { label: 'Google Gemini', icon: '🔵', color: 'from-blue-500 to-blue-600' },
  openai: { label: 'OpenAI', icon: '🟢', color: 'from-green-500 to-green-600' },
  claude: { label: 'Anthropic Claude', icon: '🟣', color: 'from-purple-500 to-purple-600' },
}

export default function ModelTestingPage() {
  const [activeTab, setActiveTab] = useState('quick')
  const [provider, setProvider] = useState('gemini')
  const [apiKey, setApiKey] = useState('')
  const [modelName, setModelName] = useState('gemini-2.5-flash')
  const [testPrompt, setTestPrompt] = useState('Hello, say "Model test successful" if you can read this.')
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [bulkResults, setBulkResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleQuickTest = async () => {
    if (!apiKey || !modelName) {
      setError('Please enter API key and model name')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const token = getAuthToken()
      const response = await axios.post(
        'http://127.0.0.1:8000/api/v1/super-admin/providers/quick-test',
        {
          provider_type: provider,
          api_key: apiKey,
          model_name: modelName,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (response.data.success) {
        setResult({ type: 'quick', data: response.data.data })
      } else {
        setError(response.data.message || 'Test failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Test failed')
    } finally {
      setLoading(false)
    }
  }

  const handleFullTest = async () => {
    if (!apiKey || !modelName) {
      setError('Please enter API key and model name')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const token = getAuthToken()
      const response = await axios.post(
        'http://127.0.0.1:8000/api/v1/super-admin/providers/test-model',
        {
          provider_type: provider,
          api_key: apiKey,
          model_name: modelName,
          test_prompt: testPrompt,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (response.data.success) {
        setResult({ type: 'full', data: response.data.data })
      } else {
        setError(response.data.message || 'Test failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Test failed')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkTest = async () => {
    if (!apiKey || selectedModels.length === 0) {
      setError('Please enter API key and select at least one model')
      return
    }

    setLoading(true)
    setError(null)
    setBulkResults(null)

    try {
      const token = getAuthToken()
      const response = await axios.post(
        'http://127.0.0.1:8000/api/v1/super-admin/providers/bulk-test',
        {
          provider_type: provider,
          api_key: apiKey,
          model_names: selectedModels,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (response.data.success) {
        setBulkResults(response.data.data)
      } else {
        setError(response.data.message || 'Bulk test failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Bulk test failed')
    } finally {
      setLoading(false)
    }
  }

  const toggleModel = (modelName: string) => {
    setSelectedModels(prev =>
      prev.includes(modelName) ? prev.filter(m => m !== modelName) : [...prev, modelName]
    )
  }

  const models = PROVIDER_MODELS[provider] || []
  const providerInfo = PROVIDER_INFO[provider as keyof typeof PROVIDER_INFO]

  return (
    <div className="min-h-screen bg-brand-dark p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${providerInfo?.color} flex items-center justify-center text-xl`}>
              {providerInfo?.icon}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-brand-text font-display">Model Testing</h1>
              <p className="text-brand-text-muted text-sm mt-1">Test AI models before creating provider configurations</p>
            </div>
          </div>
        </div>

        {/* Main Container */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel - Configuration */}
          <div className="lg:col-span-1">
            <div className="bg-brand-dark-card border border-brand-dark-border rounded-xl p-5 sticky top-6">
              <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-brand-primary" />
                Configuration
              </h2>

              {/* Provider Selector */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-2">Provider</label>
                <select
                  value={provider}
                  onChange={e => {
                    setProvider(e.target.value)
                    setModelName(PROVIDER_MODELS[e.target.value][0].name)
                    setSelectedModels([])
                  }}
                  className="w-full px-3 py-2.5 bg-brand-dark-hover border border-brand-dark-border rounded-lg text-brand-text text-sm font-medium hover:border-brand-primary/50 transition focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50"
                >
                  {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.icon} {info.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* API Key Input */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-2">API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="Paste your API key"
                    className="w-full px-3 py-2.5 bg-brand-dark-hover border border-brand-dark-border rounded-lg text-brand-text text-sm placeholder-brand-text-muted hover:border-brand-primary/50 transition focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-brand-text transition p-1"
                  >
                    {showApiKey ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Model Selector */}
              <div>
                <label className="block text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-2">Model</label>
                <select
                  value={modelName}
                  onChange={e => setModelName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-brand-dark-hover border border-brand-dark-border rounded-lg text-brand-text text-sm font-medium hover:border-brand-primary/50 transition focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50"
                >
                  {models.map(m => (
                    <option key={m.name} value={m.name}>
                      {m.emoji} {m.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-brand-text-muted mt-2 leading-relaxed">
                  {models.find(m => m.name === modelName)?.recommendation}
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel - Testing */}
          <div className="lg:col-span-2">
            {/* Error Banner */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 animate-pulse">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">Test Failed</p>
                  <p className="text-xs text-red-300/80 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-brand-dark-card border border-brand-dark-border rounded-lg p-1">
              {[
                { id: 'quick', label: '⚡ Quick', desc: 'Availability Check' },
                { id: 'full', label: '🔍 Full', desc: 'With Response' },
                { id: 'bulk', label: '🔄 Bulk', desc: 'Multiple Models' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setError(null)
                    setResult(null)
                    setBulkResults(null)
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-md transition font-medium text-sm flex flex-col items-center gap-0.5 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-brand-primary to-brand-primary-light text-white shadow-lg shadow-brand-primary/40'
                      : 'text-brand-text-muted hover:text-brand-text'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-xs opacity-80">{tab.desc}</span>
                </button>
              ))}
            </div>

            {/* Quick Test Tab */}
            {activeTab === 'quick' && (
              <div className="space-y-4">
                <button
                  onClick={handleQuickTest}
                  disabled={loading || !apiKey || !modelName}
                  className="w-full py-3 px-4 bg-gradient-to-r from-brand-primary to-brand-primary-light hover:shadow-lg hover:shadow-brand-primary/40 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>Run Quick Test</span>
                    </>
                  )}
                </button>

                {result?.type === 'quick' && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-green-400">Model is Available</p>
                      <p className="text-xs text-green-300/70 mt-1">Ready to use for job extraction and other tasks</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Full Test Tab */}
            {activeTab === 'full' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-2">Test Prompt</label>
                  <textarea
                    value={testPrompt}
                    onChange={e => setTestPrompt(e.target.value)}
                    placeholder="Enter a test prompt"
                    rows={3}
                    className="w-full px-3 py-2.5 bg-brand-dark-hover border border-brand-dark-border rounded-lg text-brand-text text-sm placeholder-brand-text-muted hover:border-brand-primary/50 transition focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/50 resize-none"
                  />
                </div>

                <button
                  onClick={handleFullTest}
                  disabled={loading || !apiKey || !modelName}
                  className="w-full py-3 px-4 bg-gradient-to-r from-brand-primary to-brand-primary-light hover:shadow-lg hover:shadow-brand-primary/40 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      <span>Run Full Test</span>
                    </>
                  )}
                </button>

                {result?.type === 'full' && result?.data && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <p className="text-sm font-semibold text-green-400">Test Successful</p>
                    </div>
                    <div className="bg-brand-dark-hover border border-brand-dark-border rounded-lg p-3 overflow-auto max-h-48">
                      <pre className="text-xs text-brand-text-muted font-mono leading-relaxed">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bulk Test Tab */}
            {activeTab === 'bulk' && (
              <div className="space-y-4">
                <div className="max-h-48 overflow-y-auto space-y-2 p-4 bg-brand-dark-hover border border-brand-dark-border rounded-lg">
                  {models.map(m => (
                    <label
                      key={m.name}
                      className="flex items-center gap-3 p-3 hover:bg-brand-dark-card rounded-lg cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedModels.includes(m.name)}
                        onChange={() => toggleModel(m.name)}
                        className="w-4 h-4 rounded border-brand-dark-border bg-brand-dark-card accent-brand-primary cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-brand-text">{m.emoji} {m.name}</div>
                        <div className="text-xs text-brand-text-muted truncate">{m.recommendation}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  onClick={handleBulkTest}
                  disabled={loading || !apiKey || selectedModels.length === 0}
                  className="w-full py-3 px-4 bg-gradient-to-r from-brand-primary to-brand-primary-light hover:shadow-lg hover:shadow-brand-primary/40 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Testing {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''}...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>Test {selectedModels.length} Model{selectedModels.length !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </button>

                {bulkResults && (
                  <div className="space-y-2">
                    {bulkResults.map((res: any) => (
                      <div
                        key={res.model}
                        className={`p-3 rounded-lg border flex items-center justify-between ${
                          res.available
                            ? 'bg-green-500/5 border-green-500/30'
                            : 'bg-red-500/5 border-red-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {res.available ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          )}
                          <span className={`text-sm font-medium truncate ${res.available ? 'text-green-400' : 'text-red-400'}`}>
                            {res.model}
                          </span>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${res.available ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                          {res.available ? '✓' : '✗'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Help */}
        <div className="mt-8 p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-lg">
          <p className="text-xs text-brand-text-muted leading-relaxed">
            💡 <span className="font-semibold text-brand-text">Tip:</span> Start with Quick Test to verify your API key works. Use Full Test to see model responses. Bulk Test helps identify the best-performing model for your use case.
          </p>
        </div>
      </div>
    </div>
  )
}
