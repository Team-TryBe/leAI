'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { getAuthToken } from '@/lib/auth'
import { ArrowLeft } from 'lucide-react'

export default function MasterCvPreviewPage() {
  const [data, setData] = useState<any>(null)

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
      }
    }

    fetchProfile()
  }, [])

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

        <div>
          <h1 className="text-3xl font-display font-bold text-brand-text">Master CV JSON Preview</h1>
          <p className="text-brand-text-muted">This is the structured data saved to your profile.</p>
        </div>

        <div className="card-dark p-6">
          <pre className="text-xs md:text-sm text-brand-text whitespace-pre-wrap break-words">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </DashboardLayout>
  )
}
