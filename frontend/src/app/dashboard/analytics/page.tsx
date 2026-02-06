'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

export default function AnalyticsPage() {
  const router = useRouter()

  return (
    <DashboardLayout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl p-12 text-center max-w-md">
          <h1 className="text-3xl font-bold text-brand-text mb-4">Analytics</h1>
          <p className="text-brand-text-muted mb-6">
            Analytics are now integrated in the Applications page.
          </p>
          <button
            onClick={() => router.push('/dashboard/applications')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-accent to-[#a78bfa] text-white rounded-lg hover:shadow-lg transition-all"
          >
            View Applications
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
