'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { getAuthToken } from '@/lib/auth'
import { ArrowLeft, Download, FileText } from 'lucide-react'

export default function MasterCvPreviewPage() {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = getAuthToken()
        if (!token) return

        const response = await fetch('http://127.0.0.1:8000/api/v1/master-profile', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) return

        const result = await response.json()
        setData(result?.data || {})
      } catch (error) {
        console.error('Failed to load master profile preview:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleExportJson = () => {
    if (!data) return
    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'master-profile.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/master-cv"
            className="inline-flex items-center gap-2 text-brand-accent hover:underline"
          >
            <ArrowLeft size={18} /> Back to Master CV
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-primary/10 via-brand-accent/5 to-purple-500/10 border border-brand-primary/20 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-primary/20 to-brand-accent/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-brand-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-brand-text">Master CV JSON Preview</h1>
                <p className="text-xs text-brand-text-muted mt-1">
                  This is the structured data saved to your profile.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJson}
                disabled={!data}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-brand-primary to-brand-accent text-white text-xs font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={14} />
                Export JSON
              </button>
            </div>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-primary/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
          <div className="relative card-dark p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-primary/20 to-brand-accent/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-brand-primary" />
                </div>
                <h2 className="text-sm font-semibold text-brand-text">JSON Data</h2>
              </div>
              <span className="text-xs text-brand-text-muted">Read-only</span>
            </div>

            <div className="rounded-lg border border-brand-dark-border bg-brand-dark-border/40 p-4 max-h-[70vh] overflow-auto">
              <pre className="text-xs md:text-sm text-brand-text whitespace-pre-wrap break-words leading-relaxed">
                {isLoading ? 'Loading...' : JSON.stringify(data || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
