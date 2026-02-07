'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import {
  ArrowLeft,
  Building2,
  MapPin,
  DollarSign,
  Clock,
  Mail,
  FileText,
  Save,
  Loader2,
  AlertCircle,
  Briefcase,
  Tag,
} from 'lucide-react'
import { getAuthToken } from '@/lib/auth'

type ExtractedJob = {
  id?: number
  job_title: string
  company_name: string
  location?: string
  job_description?: string
  key_requirements: string[]
  preferred_skills: string[]
  nice_to_have: string[]
  job_level?: string
  employment_type?: string
  salary_range?: string
  application_deadline?: string
  application_deadline_notes?: string
  application_email_to?: string
  application_email_cc?: string
  application_method?: string
  application_url?: string
  responsibilities?: string[]
  benefits?: string[]
  company_description?: string
  company_industry?: string
  company_size?: string
}

export default function SavedJobDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [job, setJob] = useState<ExtractedJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchJobDetails()
  }, [jobId])

  const fetchJobDetails = async () => {
    try {
      setLoading(true)
      const token = getAuthToken()
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/job-extractor/extracted/${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch job details')
      }

      const result = await response.json()
      setJob(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin mr-2" size={32} />
          <span className="text-brand-text-muted">Loading job details...</span>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !job) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-brand-primary hover:text-brand-accent transition mb-6"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-xl blur opacity-75"></div>
            <div className="relative rounded-xl bg-gradient-to-br from-red-500/10 via-rose-500/5 to-red-500/10 border border-red-500/30 p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-400">Error</h3>
                  <p className="text-sm text-red-300/80 mt-1">{error || 'Job not found'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-brand-primary hover:text-brand-accent transition text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Back to Saved Jobs
        </button>

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-purple-500/10 border border-indigo-500/20 p-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-brand-text">{job.job_title}</h1>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-2 text-brand-text-muted">
                <Building2 size={16} />
                <span>{job.company_name}</span>
              </div>
              {job.location && (
                <div className="flex items-center gap-2 text-brand-text-muted">
                  <MapPin size={16} />
                  <span>{job.location}</span>
                </div>
              )}
              {job.salary_range && (
                <div className="flex items-center gap-2 text-brand-text-muted">
                  <DollarSign size={16} />
                  <span>{job.salary_range}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Key Info Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {job.job_level && (
            <div className="card-dark p-3 rounded-lg">
              <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Level</p>
              <p className="text-sm font-medium text-brand-text">{job.job_level}</p>
            </div>
          )}
          {job.employment_type && (
            <div className="card-dark p-3 rounded-lg">
              <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Type</p>
              <p className="text-sm font-medium text-brand-text">{job.employment_type}</p>
            </div>
          )}
          {job.application_deadline && (
            <div className="card-dark p-3 rounded-lg">
              <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Deadline</p>
              <p className="text-sm font-medium text-brand-text">{job.application_deadline}</p>
            </div>
          )}
          {job.company_industry && (
            <div className="card-dark p-3 rounded-lg">
              <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Industry</p>
              <p className="text-sm font-medium text-brand-text">{job.company_industry}</p>
            </div>
          )}
        </div>

        {/* Key Requirements & Skills Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {job.key_requirements && job.key_requirements.length > 0 && (
            <div className="card-dark p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-brand-text mb-3 flex items-center gap-2">
                <Briefcase size={16} />
                Key Requirements
              </h3>
              <ul className="space-y-1.5">
                {job.key_requirements.slice(0, 5).map((req, idx) => (
                  <li key={idx} className="text-xs text-brand-text-muted flex gap-2">
                    <span className="text-indigo-400 flex-shrink-0">•</span>
                    <span>{req}</span>
                  </li>
                ))}
                {job.key_requirements.length > 5 && (
                  <li className="text-xs text-brand-text-muted italic">
                    +{job.key_requirements.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          )}

          {job.preferred_skills && job.preferred_skills.length > 0 && (
            <div className="card-dark p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-brand-text mb-3 flex items-center gap-2">
                <Tag size={16} />
                Skills
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {job.preferred_skills.slice(0, 6).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded text-xs bg-green-500/10 text-green-400 border border-green-500/20"
                  >
                    {skill}
                  </span>
                ))}
                {job.preferred_skills.length > 6 && (
                  <span className="px-2 py-1 text-xs text-brand-text-muted">
                    +{job.preferred_skills.length - 6}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {job.job_description && (
          <div className="card-dark p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-brand-text mb-3">Description</h3>
            <p className="text-sm text-brand-text-muted whitespace-pre-line leading-relaxed line-clamp-4">
              {job.job_description}
            </p>
          </div>
        )}

        {/* Application Info */}
        <div className="card-dark p-4 rounded-lg space-y-3">
          <h3 className="text-sm font-semibold text-brand-text flex items-center gap-2">
            <Mail size={16} />
            Application Info
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {job.application_method && (
              <div>
                <p className="text-brand-text-muted uppercase text-xs tracking-wider mb-1">Method</p>
                <p className="text-brand-text">{job.application_method}</p>
              </div>
            )}
            {job.application_email_to && (
              <div>
                <p className="text-brand-text-muted uppercase text-xs tracking-wider mb-1">Email To</p>
                <p className="text-brand-text font-mono break-all text-xs">{job.application_email_to}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => router.back()}
            className="flex-1 px-4 py-2.5 rounded-lg border border-brand-dark-border text-brand-text text-sm font-medium hover:bg-brand-dark-border transition"
          >
            Back
          </button>
          <button
            onClick={() => {
              const url = `/dashboard/applications/new?job_id=${job.id}&extracted=true`;
              console.log('Navigating to:', url, 'with job.id:', job.id);
              router.push(url);
            }}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Save size={16} />
            Apply Now
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
