'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import {
  ArrowLeft,
  Building2,
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Mail,
  FileText,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
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
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-brand-primary hover:text-brand-accent transition mb-6"
          >
            <ArrowLeft size={18} />
            <span>Back to Saved Jobs</span>
          </button>

          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-xl blur opacity-75"></div>
            <div className="relative rounded-xl bg-gradient-to-br from-red-500/10 via-rose-500/5 to-red-500/10 border border-red-500/30 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-400 text-lg">Error Loading Job</h3>
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-brand-primary hover:text-brand-accent transition"
        >
          <ArrowLeft size={18} />
          <span>Back to Saved Jobs</span>
        </button>

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-purple-500/10 border border-indigo-500/20 p-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-brand-text">{job.job_title}</h1>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-brand-text-muted">
                <Building2 size={18} />
                <span className="text-lg">{job.company_name}</span>
              </div>
              {job.location && (
                <div className="flex items-center gap-2 text-brand-text-muted">
                  <MapPin size={18} />
                  <span className="text-lg">{job.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Key Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {job.job_level && (
            <div className="card-dark p-4 rounded-lg">
              <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-2">Job Level</p>
              <p className="text-lg font-semibold text-brand-text">{job.job_level}</p>
            </div>
          )}
          {job.employment_type && (
            <div className="card-dark p-4 rounded-lg">
              <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-2">Employment Type</p>
              <p className="text-lg font-semibold text-brand-text">{job.employment_type}</p>
            </div>
          )}
          {job.salary_range && (
            <div className="card-dark p-4 rounded-lg">
              <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-2">Salary Range</p>
              <p className="text-lg font-semibold text-brand-text">{job.salary_range}</p>
            </div>
          )}
          {job.application_deadline && (
            <div className="card-dark p-4 rounded-lg">
              <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-2">Application Deadline</p>
              <p className="text-lg font-semibold text-brand-text">{job.application_deadline}</p>
            </div>
          )}
        </div>

        {job.application_deadline_notes && (
          <div className="bg-brand-dark-border border border-yellow-500/20 rounded-lg p-4">
            <p className="text-sm text-brand-text-muted mb-2">Deadline Notes:</p>
            <p className="text-brand-text">{job.application_deadline_notes}</p>
          </div>
        )}

        {/* Job Description */}
        {job.job_description && (
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative card-dark p-6 rounded-xl space-y-3">
              <h2 className="text-xl font-semibold text-brand-text flex items-center gap-2">
                <FileText size={20} />
                Job Description
              </h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-brand-text whitespace-pre-line leading-relaxed">{job.job_description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Key Requirements */}
        {job.key_requirements && job.key_requirements.length > 0 && (
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative card-dark p-6 rounded-xl space-y-4">
              <h2 className="text-xl font-semibold text-brand-text flex items-center gap-2">
                <Briefcase size={20} />
                Key Requirements
              </h2>
              <ul className="space-y-2">
                {job.key_requirements.map((req, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="text-indigo-400 mt-1">•</span>
                    <span className="text-brand-text">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Preferred Skills */}
        {job.preferred_skills && job.preferred_skills.length > 0 && (
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative card-dark p-6 rounded-xl space-y-4">
              <h2 className="text-xl font-semibold text-brand-text flex items-center gap-2">
                <CheckCircle2 size={20} />
                Preferred Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {job.preferred_skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Responsibilities */}
        {job.responsibilities && job.responsibilities.length > 0 && (
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative card-dark p-6 rounded-xl space-y-4">
              <h2 className="text-xl font-semibold text-brand-text">Responsibilities</h2>
              <ul className="space-y-2">
                {job.responsibilities.map((resp, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="text-orange-400 mt-1">•</span>
                    <span className="text-brand-text">{resp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Benefits */}
        {job.benefits && job.benefits.length > 0 && (
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500/20 to-rose-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative card-dark p-6 rounded-xl space-y-4">
              <h2 className="text-xl font-semibold text-brand-text">Benefits</h2>
              <ul className="space-y-2">
                {job.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="text-pink-400 mt-1">•</span>
                    <span className="text-brand-text">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Company Info */}
        {(job.company_description || job.company_industry || job.company_size) && (
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative card-dark p-6 rounded-xl space-y-4">
              <h2 className="text-xl font-semibold text-brand-text">About the Company</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {job.company_industry && (
                  <div>
                    <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Industry</p>
                    <p className="text-brand-text">{job.company_industry}</p>
                  </div>
                )}
                {job.company_size && (
                  <div>
                    <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Company Size</p>
                    <p className="text-brand-text">{job.company_size}</p>
                  </div>
                )}
              </div>
              {job.company_description && (
                <p className="text-brand-text leading-relaxed">{job.company_description}</p>
              )}
            </div>
          </div>
        )}

        {/* Application Details */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
          <div className="relative card-dark p-6 rounded-xl space-y-4">
            <h2 className="text-xl font-semibold text-brand-text flex items-center gap-2">
              <Mail size={20} />
              How to Apply
            </h2>
            <div className="space-y-3">
              {job.application_method && (
                <div>
                  <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Application Method</p>
                  <p className="text-brand-text">{job.application_method}</p>
                </div>
              )}
              {job.application_email_to && (
                <div>
                  <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Send to Email</p>
                  <p className="text-brand-text font-mono text-sm break-all">{job.application_email_to}</p>
                </div>
              )}
              {job.application_email_cc && (
                <div>
                  <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">CC Email</p>
                  <p className="text-brand-text font-mono text-sm break-all">{job.application_email_cc}</p>
                </div>
              )}
              {job.application_url && (
                <div>
                  <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Application Portal</p>
                  <a
                    href={job.application_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 transition font-mono text-sm break-all"
                  >
                    {job.application_url}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-gradient-to-t from-brand-dark to-transparent pt-8 -mx-6 px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 rounded-lg border border-brand-dark-border text-brand-text hover:bg-brand-dark-border transition font-semibold"
            >
              Back to Saved Jobs
            </button>
            <button
              onClick={() => router.push(`/dashboard/applications/new?job_id=${job.id}`)}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Continue with Application
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
