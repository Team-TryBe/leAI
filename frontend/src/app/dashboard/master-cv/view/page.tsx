'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { getAuthToken } from '@/lib/auth'
import { ArrowLeft, Pencil, User, FileText, GraduationCap, Briefcase, Users, Award, Zap, Code2, Target } from 'lucide-react'

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
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-primary/10 via-brand-accent/5 to-purple-500/10 border border-brand-primary/20 p-6">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-primary/20 to-brand-accent/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-brand-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-brand-text">Master CV Overview</h1>
                <p className="text-xs text-brand-text-muted mt-0.5">Comprehensive view of your professional profile</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/master-cv"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-brand-primary to-brand-accent text-white font-semibold hover:shadow-lg hover:shadow-brand-primary/20 transition text-sm"
              >
                <Pencil size={16} /> Edit Master CV
              </Link>
              <Link
                href="/dashboard/master-cv"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-dark-border border border-brand-primary/20 text-brand-text font-semibold hover:bg-brand-dark-border/80 transition text-sm"
              >
                <ArrowLeft size={16} /> Back
              </Link>
            </div>
          </div>
        </div>

        {/* Personal Details Card */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-primary/20 via-brand-accent/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
          <div className="relative card-dark p-6 rounded-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-primary/20 to-brand-accent/20 flex items-center justify-center">
                <User size={16} className="text-brand-primary" />
              </div>
              <h2 className="text-sm font-semibold text-brand-text">Personal Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.full_name && (
                <div className="p-3 rounded-lg bg-brand-dark-border border border-brand-dark-border/50">
                  <p className="text-xs text-brand-text-muted mb-1">Full Name</p>
                  <p className="text-sm font-semibold text-brand-text">{data.full_name}</p>
                </div>
              )}
              {data?.email && (
                <div className="p-3 rounded-lg bg-brand-dark-border border border-brand-dark-border/50">
                  <p className="text-xs text-brand-text-muted mb-1">Email</p>
                  <p className="text-sm font-semibold text-brand-text break-all">{data.email}</p>
                </div>
              )}
              {data?.location && (
                <div className="p-3 rounded-lg bg-brand-dark-border border border-brand-dark-border/50">
                  <p className="text-xs text-brand-text-muted mb-1">Location</p>
                  <p className="text-sm font-semibold text-brand-text">{data.location}</p>
                </div>
              )}
              {data?.phone_country_code && data?.phone_number && (
                <div className="p-3 rounded-lg bg-brand-dark-border border border-brand-dark-border/50">
                  <p className="text-xs text-brand-text-muted mb-1">Phone</p>
                  <p className="text-sm font-semibold text-brand-text">{data.phone_country_code}{data.phone_number}</p>
                </div>
              )}
            </div>

            {/* Social Links */}
            {(data?.linkedin_url || data?.github_url || data?.portfolio_url || data?.twitter_url || data?.medium_url) && (
              <div className="border-t border-brand-dark-border pt-4">
                <h3 className="text-xs font-semibold text-brand-text mb-3">Professional Links</h3>
                <div className="grid grid-cols-1 gap-2">
                  {data?.linkedin_url && (
                    <div className="p-2 rounded-lg bg-brand-dark-border/50 border border-brand-primary/10">
                      <p className="text-xs text-brand-text-muted mb-1">LinkedIn</p>
                      <a href={data.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-accent hover:underline break-all">
                        {data.linkedin_url}
                      </a>
                    </div>
                  )}
                  {data?.github_url && (
                    <div className="p-2 rounded-lg bg-brand-dark-border/50 border border-brand-primary/10">
                      <p className="text-xs text-brand-text-muted mb-1">GitHub</p>
                      <a href={data.github_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-accent hover:underline break-all">
                        {data.github_url}
                      </a>
                    </div>
                  )}
                  {data?.portfolio_url && (
                    <div className="p-2 rounded-lg bg-brand-dark-border/50 border border-brand-primary/10">
                      <p className="text-xs text-brand-text-muted mb-1">Portfolio</p>
                      <a href={data.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-accent hover:underline break-all">
                        {data.portfolio_url}
                      </a>
                    </div>
                  )}
                  {data?.twitter_url && (
                    <div className="p-2 rounded-lg bg-brand-dark-border/50 border border-brand-primary/10">
                      <p className="text-xs text-brand-text-muted mb-1">Twitter/X</p>
                      <a href={data.twitter_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-accent hover:underline break-all">
                        {data.twitter_url}
                      </a>
                    </div>
                  )}
                  {data?.medium_url && (
                    <div className="p-2 rounded-lg bg-brand-dark-border/50 border border-brand-primary/10">
                      <p className="text-xs text-brand-text-muted mb-1">Medium</p>
                      <a href={data.medium_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-accent hover:underline break-all">
                        {data.medium_url}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-rose-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
          <div className="relative card-dark p-6 rounded-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <Target size={16} className="text-purple-400" />
              </div>
              <h2 className="text-sm font-semibold text-brand-text">Personal Statement</h2>
            </div>
            <p className="text-sm text-brand-text-muted whitespace-pre-line leading-relaxed">
              {data?.personal_statement || 'No personal statement added yet.'}
            </p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-indigo-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
          <div className="relative card-dark p-6 rounded-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                <Zap size={16} className="text-cyan-400" />
              </div>
              <h2 className="text-sm font-semibold text-brand-text">Skills</h2>
            </div>
            {technicalSkills.length === 0 && softSkills.length === 0 ? (
              <p className="text-sm text-brand-text-muted">No skills added yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-brand-dark-border">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center">
                      <Code2 size={12} className="text-blue-400" />
                    </div>
                    <h3 className="text-xs font-semibold text-brand-text">Technical Skills</h3>
                  </div>
                  {technicalSkills.length === 0 ? (
                    <p className="text-brand-text-muted text-sm">No technical skills added.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {technicalSkills.map((skill: string, index: number) => (
                        <span
                          key={`tech-${index}`}
                          className="px-3 py-1.5 bg-blue-500/10 text-blue-400 text-xs font-medium rounded-full border border-blue-500/20"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-brand-dark-border">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-orange-500/30 to-amber-500/30 flex items-center justify-center">
                      <Award size={12} className="text-orange-400" />
                    </div>
                    <h3 className="text-xs font-semibold text-brand-text">Soft Skills</h3>
                  </div>
                  {softSkills.length === 0 ? (
                    <p className="text-brand-text-muted text-sm">No soft skills added.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {softSkills.map((skill: string, index: number) => (
                        <span
                          key={`soft-${index}`}
                          className="px-3 py-1.5 bg-orange-500/10 text-orange-400 text-xs font-medium rounded-full border border-orange-500/20"
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
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
          <div className="relative card-dark p-6 rounded-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                <GraduationCap size={16} className="text-green-400" />
              </div>
              <h2 className="text-sm font-semibold text-brand-text">Education</h2>
            </div>
            {education.length === 0 ? (
              <p className="text-sm text-brand-text-muted">No education entries yet.</p>
            ) : (
              <div className="space-y-3">
                {education.map((item: any, index: number) => (
                  <div key={`edu-${index}`} className="p-4 rounded-lg bg-brand-dark-border border border-green-500/10 hover:border-green-500/30 transition">
                    <p className="font-semibold text-brand-text text-sm">{item.institution}</p>
                    <p className="text-xs text-brand-text-muted mt-1">
                      {item.degree} {item.field ? `• ${item.field}` : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
                        {item.graduation_year || 'N/A'}
                      </span>
                    </div>
                    {item.details && <p className="text-xs text-brand-text-muted mt-3 leading-relaxed">{item.details}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-indigo-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
          <div className="relative card-dark p-6 rounded-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                <Briefcase size={16} className="text-cyan-400" />
              </div>
              <h2 className="text-sm font-semibold text-brand-text">Projects & Internships</h2>
            </div>
            {projects.length === 0 ? (
              <p className="text-sm text-brand-text-muted">No projects added yet.</p>
            ) : (
              <div className="space-y-3">
                {projects.map((item: any, index: number) => (
                  <div key={`proj-${index}`} className="p-4 rounded-lg bg-brand-dark-border border border-cyan-500/10 hover:border-cyan-500/30 transition">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-semibold text-brand-text text-sm flex-1">{item.name}</p>
                      {item.date && (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-medium shrink-0">
                          {item.date}
                        </span>
                      )}
                    </div>
                    {item.role && <p className="text-xs text-brand-text-muted mb-2">Role: {item.role}</p>}
                    {item.technologies?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {item.technologies.map((tech: string, techIndex: number) => (
                          <span key={`tech-${index}-${techIndex}`} className="inline-block px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-xs">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.link && (
                      <p className="text-xs text-brand-text-muted mb-2">
                        <span className="text-brand-text-muted/70">Link:</span>{' '}
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
                    {item.description && <p className="text-xs text-brand-text-muted mt-3 leading-relaxed border-t border-brand-dark-border pt-2">{item.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/20 via-rose-500/20 to-pink-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
          <div className="relative card-dark p-6 rounded-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center">
                <Users size={16} className="text-red-400" />
              </div>
              <h2 className="text-sm font-semibold text-brand-text">Referees</h2>
            </div>
            {referees.length === 0 ? (
              <p className="text-sm text-brand-text-muted">No referees added yet.</p>
            ) : (
              <div className="space-y-3">
                {referees.map((item: any, index: number) => (
                  <div key={`ref-${index}`} className="p-4 rounded-lg bg-brand-dark-border border border-red-500/10 hover:border-red-500/30 transition">
                    <p className="font-semibold text-brand-text text-sm">{item.full_name}</p>
                    <p className="text-xs text-brand-text-muted mt-1">{item.designation}</p>
                    <p className="text-xs text-brand-text-muted">{item.organization}</p>
                    <div className="flex flex-wrap gap-3 mt-2 pt-2 border-t border-brand-dark-border">
                      {(item.country_code && item.phone) || item.phone ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400"></span>
                          <p className="text-xs text-brand-text-muted">
                            {item.country_code}{item.phone}
                          </p>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400"></span>
                        <p className="text-xs text-brand-text-muted break-all">{item.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-orange-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
          <div className="relative card-dark p-6 rounded-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-500/20 to-amber-500/20 flex items-center justify-center">
                <Award size={16} className="text-yellow-400" />
              </div>
              <h2 className="text-sm font-semibold text-brand-text">Certifications</h2>
            </div>
            {certifications.length === 0 ? (
              <p className="text-sm text-brand-text-muted">No certifications added yet.</p>
            ) : (
              <div className="space-y-3">
                {certifications.map((item: any, index: number) => (
                  <div key={`cert-${index}`} className="p-4 rounded-lg bg-brand-dark-border border border-yellow-500/10 hover:border-yellow-500/30 transition">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-semibold text-brand-text text-sm flex-1">{item.name}</p>
                      {item.date && (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-medium shrink-0">
                          {item.date}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-brand-text-muted mb-2">Issuer: {item.issuer}</p>
                    {item.credential_id && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                        <p className="text-xs text-brand-text-muted">ID: {item.credential_id}</p>
                      </div>
                    )}
                    {item.credential_url && (
                      <div className="mb-2">
                        <p className="text-xs text-brand-text-muted/70 mb-1">Verification Link:</p>
                        <a href={item.credential_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-accent hover:underline break-all">
                          {item.credential_url}
                        </a>
                      </div>
                    )}
                    {item.file_path && (
                      <div className="flex items-center gap-1.5 pt-2 border-t border-brand-dark-border">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        <p className="text-xs text-brand-text-muted">File: {item.file_path.split('/').slice(-1)[0]}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
