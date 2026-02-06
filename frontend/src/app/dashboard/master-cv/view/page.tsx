'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { getAuthToken } from '@/lib/auth'
import { ArrowLeft, Pencil } from 'lucide-react'

export default function MasterCvViewPage() {
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
        console.error('Failed to load master profile:', error)
      }
    }

    fetchProfile()
  }, [])

  const education = data?.education || []
  const projects = data?.projects || []
  const referees = data?.referees || []
  const certifications = data?.certifications || []
  const technicalSkills = data?.technical_skills || []
  const softSkills = data?.soft_skills || []

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/master-cv"
            className="inline-flex items-center gap-2 text-brand-accent hover:underline"
          >
            <ArrowLeft size={18} /> Back to Master CV
          </Link>
          <Link
            href="/dashboard/master-cv"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:opacity-90 transition"
          >
            <Pencil size={18} /> Edit Master CV
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-display font-bold text-brand-text">Master CV Details</h1>
          <p className="text-brand-text-muted">Neatly formatted view of your saved profile.</p>
        </div>

        {/* Personal Details Card */}
        <div className="card-dark p-6 space-y-4">
          <h2 className="text-xl font-semibold text-brand-text">Personal Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {data?.full_name && (
              <div>
                <p className="text-brand-text-muted">Full Name</p>
                <p className="font-semibold text-brand-text">{data.full_name}</p>
              </div>
            )}
            {data?.email && (
              <div>
                <p className="text-brand-text-muted">Email</p>
                <p className="font-semibold text-brand-text">{data.email}</p>
              </div>
            )}
            {data?.location && (
              <div>
                <p className="text-brand-text-muted">Location</p>
                <p className="font-semibold text-brand-text">{data.location}</p>
              </div>
            )}
            {data?.phone_country_code && data?.phone_number && (
              <div>
                <p className="text-brand-text-muted">Phone</p>
                <p className="font-semibold text-brand-text">{data.phone_country_code}{data.phone_number}</p>
              </div>
            )}
          </div>

          {/* Social Links */}
          {(data?.linkedin_url || data?.github_url || data?.portfolio_url || data?.twitter_url || data?.medium_url) && (
            <div className="border-t border-brand-dark-border pt-4">
              <h3 className="text-sm font-semibold text-brand-text mb-3">Professional Links</h3>
              <div className="space-y-2">
                {data?.linkedin_url && (
                  <p className="text-xs">
                    <span className="text-brand-text-muted">LinkedIn:</span>{' '}
                    <a href={data.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline break-all">
                      {data.linkedin_url}
                    </a>
                  </p>
                )}
                {data?.github_url && (
                  <p className="text-xs">
                    <span className="text-brand-text-muted">GitHub:</span>{' '}
                    <a href={data.github_url} target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline break-all">
                      {data.github_url}
                    </a>
                  </p>
                )}
                {data?.portfolio_url && (
                  <p className="text-xs">
                    <span className="text-brand-text-muted">Portfolio:</span>{' '}
                    <a href={data.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline break-all">
                      {data.portfolio_url}
                    </a>
                  </p>
                )}
                {data?.twitter_url && (
                  <p className="text-xs">
                    <span className="text-brand-text-muted">Twitter/X:</span>{' '}
                    <a href={data.twitter_url} target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline break-all">
                      {data.twitter_url}
                    </a>
                  </p>
                )}
                {data?.medium_url && (
                  <p className="text-xs">
                    <span className="text-brand-text-muted">Medium:</span>{' '}
                    <a href={data.medium_url} target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline break-all">
                      {data.medium_url}
                    </a>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card-dark p-6 space-y-4">
          <h2 className="text-xl font-semibold text-brand-text">Personal Statement</h2>
          <p className="text-brand-text-muted whitespace-pre-line">
            {data?.personal_statement || 'No personal statement added yet.'}
          </p>
        </div>

        <div className="card-dark p-6 space-y-4">
          <h2 className="text-xl font-semibold text-brand-text">Skills</h2>
          {technicalSkills.length === 0 && softSkills.length === 0 ? (
            <p className="text-brand-text-muted">No skills added yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-brand-text mb-2">Technical Skills</h3>
                {technicalSkills.length === 0 ? (
                  <p className="text-brand-text-muted text-sm">No technical skills added.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {technicalSkills.map((skill: string, index: number) => (
                      <span
                        key={`tech-${index}`}
                        className="px-3 py-1 bg-brand-accent/10 text-brand-accent text-xs rounded-full border border-brand-accent/30"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-brand-text mb-2">Soft Skills</h3>
                {softSkills.length === 0 ? (
                  <p className="text-brand-text-muted text-sm">No soft skills added.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {softSkills.map((skill: string, index: number) => (
                      <span
                        key={`soft-${index}`}
                        className="px-3 py-1 bg-brand-primary/10 text-brand-primary text-xs rounded-full border border-brand-primary/30"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card-dark p-6 space-y-4">
          <h2 className="text-xl font-semibold text-brand-text">Education</h2>
          {education.length === 0 ? (
            <p className="text-brand-text-muted">No education entries yet.</p>
          ) : (
            <div className="space-y-3">
              {education.map((item: any, index: number) => (
                <div key={`edu-${index}`} className="p-4 rounded-lg bg-brand-dark-border">
                  <p className="font-semibold text-brand-text">{item.institution}</p>
                  <p className="text-brand-text-muted">
                    {item.degree} {item.field ? `• ${item.field}` : ''}
                  </p>
                  <p className="text-xs text-brand-text-muted">Year: {item.graduation_year || 'N/A'}</p>
                  {item.details && <p className="text-sm text-brand-text-muted mt-2">{item.details}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-dark p-6 space-y-4">
          <h2 className="text-xl font-semibold text-brand-text">Projects & Internships</h2>
          {projects.length === 0 ? (
            <p className="text-brand-text-muted">No projects added yet.</p>
          ) : (
            <div className="space-y-3">
              {projects.map((item: any, index: number) => (
                <div key={`proj-${index}`} className="p-4 rounded-lg bg-brand-dark-border">
                  <p className="font-semibold text-brand-text">{item.name}</p>
                  {item.role && <p className="text-sm text-brand-text-muted">Role: {item.role}</p>}
                  {item.date && <p className="text-xs text-brand-text-muted">Year: {item.date}</p>}
                  {item.technologies?.length > 0 && (
                    <p className="text-xs text-brand-text-muted">Tech: {item.technologies.join(', ')}</p>
                  )}
                  {item.link && (
                    <p className="text-xs text-brand-text-muted">
                      Link:{' '}
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-accent hover:underline break-all"
                      >
                        {item.link}
                      </a>
                    </p>
                  )}
                  {item.description && <p className="text-sm text-brand-text-muted mt-2">{item.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-dark p-6 space-y-4">
          <h2 className="text-xl font-semibold text-brand-text">Referees</h2>
          {referees.length === 0 ? (
            <p className="text-brand-text-muted">No referees added yet.</p>
          ) : (
            <div className="space-y-3">
              {referees.map((item: any, index: number) => (
                <div key={`ref-${index}`} className="p-4 rounded-lg bg-brand-dark-border">
                  <p className="font-semibold text-brand-text">{item.full_name}</p>
                  <p className="text-sm text-brand-text-muted">{item.designation}</p>
                  <p className="text-xs text-brand-text-muted">{item.organization}</p>
                  {item.country_code && item.phone ? (
                    <p className="text-xs text-brand-text-muted">Phone: {item.country_code}{item.phone}</p>
                  ) : item.phone ? (
                    <p className="text-xs text-brand-text-muted">Phone: {item.phone}</p>
                  ) : null}
                  <p className="text-xs text-brand-text-muted">{item.email}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-dark p-6 space-y-4">
          <h2 className="text-xl font-semibold text-brand-text">Certifications</h2>
          {certifications.length === 0 ? (
            <p className="text-brand-text-muted">No certifications added yet.</p>
          ) : (
            <div className="space-y-3">
              {certifications.map((item: any, index: number) => (
                <div key={`cert-${index}`} className="p-4 rounded-lg bg-brand-dark-border">
                  <p className="font-semibold text-brand-text">{item.name}</p>
                  <p className="text-sm text-brand-text-muted">Issuer: {item.issuer}</p>
                  <p className="text-xs text-brand-text-muted">Year: {item.date || 'N/A'}</p>
                  {item.credential_id && (
                    <p className="text-xs text-brand-text-muted">ID: {item.credential_id}</p>
                  )}
                  {item.credential_url && (
                    <p className="text-xs text-brand-text-muted break-words">Link: {item.credential_url}</p>
                  )}
                  {item.file_path && (
                    <p className="text-xs text-brand-text-muted">File: {item.file_path.split('/').slice(-1)[0]}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
