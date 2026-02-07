'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { GraduationCap, Briefcase, Users, Plus, Trash2, FileText, Save, Eye, Zap, Code2, Award } from 'lucide-react'
import { getAuthToken } from '@/lib/auth'

// African country codes constant
const AFRICAN_COUNTRY_CODES = [
  { name: 'Kenya', code: '+254' },
  { name: 'Uganda', code: '+256' },
  { name: 'Tanzania', code: '+255' },
  { name: 'Rwanda', code: '+250' },
  { name: 'Burundi', code: '+257' },
  { name: 'South Africa', code: '+27' },
  { name: 'Nigeria', code: '+234' },
  { name: 'Ghana', code: '+233' },
  { name: 'Ethiopia', code: '+251' },
  { name: 'Egypt', code: '+20' },
  { name: 'Morocco', code: '+212' },
  { name: 'Algeria', code: '+213' },
  { name: 'Tunisia', code: '+216' },
  { name: 'Senegal', code: '+221' },
  { name: 'Mali', code: '+223' },
  { name: 'Cameroon', code: '+237' },
  { name: 'Côte d\'Ivoire', code: '+225' },
  { name: 'Benin', code: '+229' },
  { name: 'Togo', code: '+228' },
  { name: 'Gabon', code: '+241' },
  { name: 'Angola', code: '+244' },
  { name: 'Zambia', code: '+260' },
  { name: 'Zimbabwe', code: '+263' },
  { name: 'Botswana', code: '+267' },
  { name: 'Lesotho', code: '+266' },
  { name: 'Eswatini', code: '+268' },
  { name: 'Namibia', code: '+264' },
  { name: 'Mozambique', code: '+258' },
  { name: 'Malawi', code: '+265' },
  { name: 'Kenya', code: '+254' },
  { name: 'Democratic Republic of Congo', code: '+243' },
  { name: 'Republic of Congo', code: '+242' },
  { name: 'Chad', code: '+235' },
  { name: 'Sudan', code: '+249' },
  { name: 'South Sudan', code: '+211' },
  { name: 'Central African Republic', code: '+236' },
  { name: 'Djibouti', code: '+253' },
  { name: 'Somaliland', code: '+252' },
  { name: 'Guinea', code: '+224' },
  { name: 'Sierra Leone', code: '+232' },
  { name: 'Liberia', code: '+231' },
  { name: 'Mauritius', code: '+230' },
  { name: 'Seychelles', code: '+248' },
  { name: 'Comoros', code: '+269' },
  { name: 'Madagascar', code: '+261' },
  { name: 'Equatorial Guinea', code: '+240' },
  { name: 'Mauritania', code: '+222' },
  { name: 'Cape Verde', code: '+238' },
  { name: 'Sao Tome and Principe', code: '+239' },
]

const TECHNICAL_SKILLS_OPTIONS = [
  'React', 'Next.js', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Django', 'FastAPI',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
  'HTML', 'CSS', 'Tailwind CSS', 'Git', 'CI/CD', 'GraphQL', 'REST APIs', 'Linux',
  'Flutter', 'React Native', 'Java', 'Spring Boot', 'C#', '.NET', 'PHP', 'Laravel',
]

const SOFT_SKILLS_OPTIONS = [
  'Communication', 'Leadership', 'Teamwork', 'Problem Solving', 'Time Management',
  'Adaptability', 'Critical Thinking', 'Creativity', 'Emotional Intelligence',
  'Conflict Resolution', 'Stakeholder Management', 'Presentation Skills', 'Collaboration',
  'Attention to Detail', 'Self-Motivation', 'Decision Making',
]

type EducationItem = {
  institution: string
  degree: string
  field: string
  graduation_year: number | ''
  details?: string
}

type ProjectItem = {
  name: string
  description: string
  technologies: string
  date: string
  role?: string
  link?: string
}

type RefereeItem = {
  full_name: string
  designation: string
  organization: string
  country_code?: string
  phone?: string
  email: string
}

type CertificationItem = {
  name: string
  issuer: string
  year: string
  credential_id?: string
  credential_url?: string
  file_path?: string
}

type MasterProfilePayload = {
  // Personal details
  full_name?: string
  phone_country_code?: string
  phone_number?: string
  email?: string
  location?: string
  
  // Personal statement
  personal_statement?: string
  
  // Sections
  education: EducationItem[]
  projects: ProjectItem[]
  technical_skills?: string[]
  soft_skills?: string[]
  referees: RefereeItem[]
  certifications: CertificationItem[]
  
  // Social links
  linkedin_url?: string
  github_url?: string
  portfolio_url?: string
  twitter_url?: string
  medium_url?: string
}

const emptyEducation: EducationItem = {
  institution: '',
  degree: '',
  field: '',
  graduation_year: '',
  details: '',
}

const emptyProject: ProjectItem = {
  name: '',
  description: '',
  technologies: '',
  date: '',
  role: '',
  link: '',
}

const emptyReferee: RefereeItem = {
  full_name: '',
  designation: '',
  organization: '',
  country_code: '+254',
  phone: '',
  email: '',
}

const emptyCertification: CertificationItem = {
  name: '',
  issuer: '',
  year: '',
  credential_id: '',
  credential_url: '',
  file_path: '',
}

export default function MasterCvPage() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState('')
  
  // Personal details
  const [fullName, setFullName] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('+254')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [location, setLocation] = useState('')
  
  // Social links
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')
  const [mediumUrl, setMediumUrl] = useState('')
  
  // Profile sections
  const [personalStatement, setPersonalStatement] = useState('')
  const [education, setEducation] = useState<EducationItem[]>([emptyEducation])
  const [projects, setProjects] = useState<ProjectItem[]>([emptyProject])
  const [technicalSkills, setTechnicalSkills] = useState<string[]>([])
  const [softSkills, setSoftSkills] = useState<string[]>([])
  const [selectedTechnicalSkill, setSelectedTechnicalSkill] = useState('')
  const [selectedSoftSkill, setSelectedSoftSkill] = useState('')
  const [referees, setReferees] = useState<RefereeItem[]>([emptyReferee])
  const [certifications, setCertifications] = useState<CertificationItem[]>([emptyCertification])
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: currentYear - 1970 + 1 }, (_, i) => currentYear - i)

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true)
      try {
        const token = getAuthToken()
        if (!token) {
          setIsLoading(false)
          return
        }

        const response = await fetch('http://127.0.0.1:8000/api/v1/master-profile', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          setIsLoading(false)
          return
        }

        const result = await response.json()
        const data = result?.data
        if (!data) {
          setIsLoading(false)
          return
        }

        // Personal details
        setFullName(data.full_name || '')
        setPhoneCountryCode(data.phone_country_code || '+254')
        setPhoneNumber(data.phone_number || '')
        setEmail(data.email || '')
        setLocation(data.location || '')
        
        // Social links
        setLinkedinUrl(data.linkedin_url || '')
        setGithubUrl(data.github_url || '')
        setPortfolioUrl(data.portfolio_url || '')
        setTwitterUrl(data.twitter_url || '')
        setMediumUrl(data.medium_url || '')
        
        // Profile sections
        setPersonalStatement(data.personal_statement || '')
        setEducation(data.education?.length ? data.education : [emptyEducation])
        setProjects(
          data.projects?.length
            ? data.projects.map((p: any) => ({
                name: p.name || '',
                description: p.description || '',
                technologies: (p.technologies || []).join(', '),
                date: p.date || '',
                role: p.role || '',
                link: p.link || p.project_link || p.url || '',
              }))
            : [emptyProject]
        )
        setTechnicalSkills(data.technical_skills || [])
        setSoftSkills(data.soft_skills || [])
        setReferees(data.referees?.length ? data.referees : [emptyReferee])
        setCertifications(
          data.certifications?.length
            ? data.certifications.map((c: any) => ({
                name: c.name || '',
                issuer: c.issuer || '',
                year: c.date ? String(c.date) : '',
                credential_id: c.credential_id || '',
                credential_url: c.credential_url || '',
                file_path: c.file_path || '',
              }))
            : [emptyCertification]
        )
      } catch (error) {
        console.error('Failed to load master profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage('')
    try {
      const token = getAuthToken()
      if (!token) {
        setSaveMessage('❌ Authentication failed. Please login again.')
        setIsSaving(false)
        return
      }

      const payload: MasterProfilePayload = {
        // Personal details
        full_name: fullName,
        phone_country_code: phoneCountryCode,
        phone_number: phoneNumber,
        email: email,
        location: location,
        
        // Social links
        linkedin_url: linkedinUrl,
        github_url: githubUrl,
        portfolio_url: portfolioUrl,
        twitter_url: twitterUrl,
        medium_url: mediumUrl,
        
        // Profile sections
        personal_statement: personalStatement,
        education: education
          .filter((e) => e.institution || e.degree || e.field)
          .map((e) => ({
            ...e,
            graduation_year: e.graduation_year === '' ? undefined : Number(e.graduation_year),
          })) as EducationItem[],
        projects: projects
          .filter((p) => p.name || p.description)
          .map((p) => ({
            ...p,
            technologies: p.technologies
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
              .join(', '),
            link: p.link || '',
          })),
        technical_skills: technicalSkills,
        soft_skills: softSkills,
        referees: referees.filter((r) => r.full_name || r.email),
        certifications: certifications
          .filter((c) => c.name || c.credential_url || c.file_path)
          .map((c) => ({
            ...c,
            date: c.year || '',
          })) as CertificationItem[],
      }

      const response = await fetch('http://127.0.0.1:8000/api/v1/master-profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          projects: payload.projects.map((p) => ({
            ...p,
            technologies: p.technologies
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
            link: p.link || undefined,
          })),
          technical_skills: payload.technical_skills || [],
          soft_skills: payload.soft_skills || [],
          certifications: payload.certifications.map((c) => ({
            name: c.name,
            issuer: c.issuer,
            date: c.year,
            credential_id: c.credential_id || undefined,
            credential_url: c.credential_url || undefined,
            file_path: c.file_path || undefined,
          })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any
        const errorMsg = errorData?.detail || 'Failed to save profile'
        
        if (Array.isArray(errorData?.detail)) {
          const details = errorData.detail
            .map((err: any) => `${err.loc?.[1] || 'Field'}: ${err.msg}`)
            .join(' | ')
          throw new Error(`Validation error: ${details}`)
        }
        
        throw new Error(typeof errorMsg === 'string' ? errorMsg : 'Failed to save profile. Please check your input.')
      }

      setSaveMessage('✓ Saved successfully! Your data has been persisted and will load automatically next time.')
    } catch (error: any) {
      console.error('Failed to save master profile:', error)
      const errorText = error?.message || 'Failed to save. Please try again.'
      setSaveMessage(`❌ ${errorText}`)
    } finally {
      setIsSaving(false)
    }
  }

  const addEducation = () => setEducation((prev) => [...prev, { ...emptyEducation }])
  const removeEducation = (index: number) =>
    setEducation((prev) => prev.filter((_, i) => i !== index))

  const addProject = () => setProjects((prev) => [...prev, { ...emptyProject }])
  const removeProject = (index: number) =>
    setProjects((prev) => prev.filter((_, i) => i !== index))

  const addReferee = () => setReferees((prev) => [...prev, { ...emptyReferee }])
  const removeReferee = (index: number) =>
    setReferees((prev) => prev.filter((_, i) => i !== index))

  const addCertification = () => setCertifications((prev) => [...prev, { ...emptyCertification }])
  const removeCertification = (index: number) =>
    setCertifications((prev) => prev.filter((_, i) => i !== index))

  const handleCertificateUpload = async (index: number, file: File) => {
    try {
      const token = getAuthToken()
      if (!token) return

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('http://127.0.0.1:8000/api/v1/master-profile/certifications/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      const filePath = result?.data?.file_path

      setCertifications((prev) =>
        prev.map((entry, idx) => (idx === index ? { ...entry, file_path: filePath } : entry))
      )
    } catch (error) {
      console.error('Failed to upload certificate:', error)
    }
  }

  return (
    <DashboardLayout>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mx-auto"></div>
            <p className="text-brand-text-muted">Loading your saved CV data...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Modern Header with Gradient */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-primary/10 via-brand-accent/5 to-purple-500/10 border border-brand-primary/20 p-6">
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-primary/20 to-brand-accent/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-brand-text">Master CV</h1>
                  <p className="text-xs text-brand-text-muted mt-0.5">Your comprehensive career profile</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-brand-primary to-brand-accent text-white font-semibold hover:shadow-lg hover:shadow-brand-primary/20 transition disabled:opacity-60 text-sm"
            >
              <Save size={18} /> {isSaving ? 'Saving...' : 'Save All'}
            </button>
            <button
              onClick={() => router.push('/dashboard/master-cv/preview')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-dark-border border border-brand-primary/20 text-brand-text font-semibold hover:bg-brand-dark-border/80 transition text-sm"
            >
              <Eye size={18} /> Preview JSON
            </button>
            <button
              onClick={() => router.push('/dashboard/master-cv/view')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-dark-border border border-brand-accent/20 text-brand-text font-semibold hover:bg-brand-dark-border/80 transition text-sm"
            >
              <Eye size={18} /> View Master CV
            </button>
          </div>

          {saveMessage && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium border-l-4 ${
                saveMessage.startsWith('✓')
                  ? 'bg-green-500/10 text-green-600 border-l-green-500'
                  : 'bg-red-500/10 text-red-600 border-l-red-500'
              }`}
            >
              <p>{saveMessage}</p>
              {saveMessage.includes('Validation') && (
                <div className="text-xs opacity-90 space-y-1 mt-2">
                <p>• Phone: Use format +2547XXXXXXXX or +2541XXXXXXXX (optional)</p>
                <p>• Email: Must be a valid email address</p>
              </div>
            )}
          </div>
        )}

        {/* Personal Details */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-primary/20 via-brand-accent/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
          <div className="relative card-dark p-6 rounded-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-primary/20 to-brand-accent/20 flex items-center justify-center">
                <Users size={16} className="text-brand-primary" />
              </div>
              <h2 className="text-sm font-semibold text-brand-text">Personal Details</h2>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Full Name</label>
                <input
                  className="w-full rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition"
                  placeholder="e.g., John Kipchoge"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Email Address</label>
                <input
                  className="w-full rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition"
                  placeholder="your@email.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Location</label>
                <input
                  className="w-full rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition"
                  placeholder="e.g., Nairobi, Kenya"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="border-t border-brand-dark-border pt-4">
              <h3 className="text-xs font-semibold text-brand-text mb-3">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Country Code</label>
                  <select
                    className="w-full rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition"
                    value={phoneCountryCode || '+254'}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                  >
                    {AFRICAN_COUNTRY_CODES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name} ({country.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Phone Number</label>
                  <input
                    className="w-full rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition"
                    placeholder="702123456"
                    value={phoneNumber}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '')
                      setPhoneNumber(digitsOnly)
                    }}
                    maxLength={15}
                  />
                  {phoneNumber && phoneCountryCode && (
                    <p className="text-brand-text-muted text-xs mt-1.5 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-text-muted"></span>
                      Full: {phoneCountryCode}{phoneNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="border-t border-brand-dark-border pt-4">
              <h3 className="text-xs font-semibold text-brand-text mb-3">Professional Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition"
                  placeholder="LinkedIn URL"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                />
                <input
                  className="rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition"
                  placeholder="GitHub URL"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
                <input
                  className="rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition"
                  placeholder="Portfolio URL"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                />
                <input
                  className="rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition"
                  placeholder="Twitter/X URL"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                />
                <input
                  className="rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition"
                  placeholder="Medium URL"
                  value={mediumUrl}
                  onChange={(e) => setMediumUrl(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Personal Statement */}
        <div className="card-dark p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="text-brand-primary" size={22} />
            <h2 className="text-xl font-semibold text-brand-text">Personal Statement</h2>
          </div>
          <textarea
            className="w-full rounded-lg bg-brand-dark-border text-brand-text p-4 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            rows={4}
            value={personalStatement}
            onChange={(e) => setPersonalStatement(e.target.value)}
            placeholder="Write 3–4 lines focusing on your career goals and academic strengths..."
          />
        </div>

        {/* Education */}
        <div className="card-dark p-6 space-y-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="text-brand-primary" size={22} />
            <h2 className="text-xl font-semibold text-brand-text">Education History</h2>
          </div>

          <div className="space-y-4">
            {education.map((item, index) => (
              <div key={`education-${index}`} className="p-4 rounded-lg bg-brand-dark-border space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    className="rounded-lg bg-brand-dark text-brand-text p-3"
                    placeholder="University Name"
                    value={item.institution}
                    onChange={(e) =>
                      setEducation((prev) =>
                        prev.map((entry, idx) =>
                          idx === index ? { ...entry, institution: e.target.value } : entry
                        )
                      )
                    }
                  />
                  <input
                    className="rounded-lg bg-brand-dark text-brand-text p-3"
                    placeholder="Degree (e.g., B.Sc Computer Science)"
                    value={item.degree}
                    onChange={(e) =>
                      setEducation((prev) =>
                        prev.map((entry, idx) =>
                          idx === index ? { ...entry, degree: e.target.value } : entry
                        )
                      )
                    }
                  />
                  <input
                    className="rounded-lg bg-brand-dark text-brand-text p-3"
                    placeholder="Field of Study"
                    value={item.field}
                    onChange={(e) =>
                      setEducation((prev) =>
                        prev.map((entry, idx) =>
                          idx === index ? { ...entry, field: e.target.value } : entry
                        )
                      )
                    }
                  />
                  <select
                    className="rounded-lg bg-brand-dark text-brand-text p-3"
                    value={item.graduation_year === '' ? '' : String(item.graduation_year)}
                    onChange={(e) =>
                      setEducation((prev) =>
                        prev.map((entry, idx) =>
                          idx === index
                            ? { ...entry, graduation_year: e.target.value ? Number(e.target.value) : '' }
                            : entry
                        )
                      )
                    }
                  >
                    <option value="">Select Year</option>
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  className="w-full rounded-lg bg-brand-dark text-brand-text p-3"
                  placeholder="Details (honors, GPA, relevant coursework)"
                  rows={2}
                  value={item.details || ''}
                  onChange={(e) =>
                    setEducation((prev) =>
                      prev.map((entry, idx) =>
                        idx === index ? { ...entry, details: e.target.value } : entry
                      )
                    )
                  }
                />
                {education.length > 1 && (
                  <button
                    onClick={() => removeEducation(index)}
                    className="inline-flex items-center gap-2 text-brand-error hover:opacity-90 transition"
                  >
                    <Trash2 size={18} /> Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addEducation}
            className="text-brand-accent font-semibold hover:underline inline-flex items-center gap-2"
          >
            <Plus size={18} /> Add Another Institution
          </button>
        </div>

        {/* Projects / Internships */}
        <div className="card-dark p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Briefcase className="text-brand-primary" size={22} />
            <h2 className="text-xl font-semibold text-brand-text">Projects & Internships</h2>
          </div>

          <div className="space-y-4">
            {projects.map((item, index) => (
              <div key={`project-${index}`} className="p-4 rounded-lg bg-brand-dark-border space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    className="rounded-lg bg-brand-dark text-brand-text p-3"
                    placeholder="Project / Internship Title"
                    value={item.name}
                    onChange={(e) =>
                      setProjects((prev) =>
                        prev.map((entry, idx) =>
                          idx === index ? { ...entry, name: e.target.value } : entry
                        )
                      )
                    }
                  />
                  <input
                    className="rounded-lg bg-brand-dark text-brand-text p-3"
                    placeholder="Role"
                    value={item.role || ''}
                    onChange={(e) =>
                      setProjects((prev) =>
                        prev.map((entry, idx) =>
                          idx === index ? { ...entry, role: e.target.value } : entry
                        )
                      )
                    }
                  />
                  <select
                    className="rounded-lg bg-brand-dark text-brand-text p-3"
                    value={item.date}
                    onChange={(e) =>
                      setProjects((prev) =>
                        prev.map((entry, idx) =>
                          idx === index ? { ...entry, date: e.target.value } : entry
                        )
                      )
                    }
                  >
                    <option value="">Select Year</option>
                    {yearOptions.map((year) => (
                      <option key={year} value={String(year)}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <input
                    className="rounded-lg bg-brand-dark text-brand-text p-3"
                    placeholder="Technologies (comma separated)"
                    value={item.technologies}
                    onChange={(e) =>
                      setProjects((prev) =>
                        prev.map((entry, idx) =>
                          idx === index ? { ...entry, technologies: e.target.value } : entry
                        )
                      )
                    }
                  />
                  <input
                    className="rounded-lg bg-brand-dark text-brand-text p-3 md:col-span-2"
                    placeholder="Project link (GitHub, live demo, or portfolio URL)"
                    value={item.link || ''}
                    onChange={(e) =>
                      setProjects((prev) =>
                        prev.map((entry, idx) =>
                          idx === index ? { ...entry, link: e.target.value } : entry
                        )
                      )
                    }
                  />
                </div>
                <textarea
                  className="w-full rounded-lg bg-brand-dark text-brand-text p-3"
                  placeholder="Describe your contribution, tools used, and outcomes..."
                  rows={3}
                  value={item.description}
                  onChange={(e) =>
                    setProjects((prev) =>
                      prev.map((entry, idx) =>
                        idx === index ? { ...entry, description: e.target.value } : entry
                      )
                    )
                  }
                />
                {projects.length > 1 && (
                  <button
                    onClick={() => removeProject(index)}
                    className="inline-flex items-center gap-2 text-brand-error hover:opacity-90 transition"
                  >
                    <Trash2 size={18} /> Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addProject}
            className="text-brand-accent font-semibold hover:underline inline-flex items-center gap-2"
          >
            <Plus size={18} /> Add Another Project
          </button>
        </div>

        {/* Skills */}
        <div className="card-dark p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="text-brand-primary" size={22} />
            <h2 className="text-xl font-semibold text-brand-text">Skills</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Technical Skills */}
            <div className="space-y-3">
              <label className="text-sm text-brand-text-muted">Technical Skills</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 rounded-lg bg-brand-dark text-brand-text p-3"
                  value={selectedTechnicalSkill}
                  onChange={(e) => setSelectedTechnicalSkill(e.target.value)}
                >
                  <option value="">Select a technical skill</option>
                  {TECHNICAL_SKILLS_OPTIONS.map((skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (selectedTechnicalSkill && !technicalSkills.includes(selectedTechnicalSkill)) {
                      setTechnicalSkills((prev) => [...prev, selectedTechnicalSkill])
                    }
                    setSelectedTechnicalSkill('')
                  }}
                  className="px-4 py-2 bg-brand-accent/20 text-brand-accent rounded-lg hover:bg-brand-accent/30 transition"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {technicalSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-brand-accent/10 text-brand-accent text-sm rounded-full border border-brand-accent/30"
                  >
                    {skill}
                    <button
                      onClick={() => setTechnicalSkills((prev) => prev.filter((s) => s !== skill))}
                      className="text-brand-accent hover:text-brand-accent/70"
                      aria-label={`Remove ${skill}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Soft Skills */}
            <div className="space-y-3">
              <label className="text-sm text-brand-text-muted">Soft Skills</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 rounded-lg bg-brand-dark text-brand-text p-3"
                  value={selectedSoftSkill}
                  onChange={(e) => setSelectedSoftSkill(e.target.value)}
                >
                  <option value="">Select a soft skill</option>
                  {SOFT_SKILLS_OPTIONS.map((skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (selectedSoftSkill && !softSkills.includes(selectedSoftSkill)) {
                      setSoftSkills((prev) => [...prev, selectedSoftSkill])
                    }
                    setSelectedSoftSkill('')
                  }}
                  className="px-4 py-2 bg-brand-accent/20 text-brand-accent rounded-lg hover:bg-brand-accent/30 transition"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {softSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-brand-accent/10 text-brand-accent text-sm rounded-full border border-brand-accent/30"
                  >
                    {skill}
                    <button
                      onClick={() => setSoftSkills((prev) => prev.filter((s) => s !== skill))}
                      className="text-brand-accent hover:text-brand-accent/70"
                      aria-label={`Remove ${skill}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Referees */}
        <div className="card-dark p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Users className="text-brand-primary" size={22} />
            <h2 className="text-xl font-semibold text-brand-text">Referees</h2>
          </div>

          <div className="space-y-4">
            {referees.map((item, index) => (
              <div key={`referee-${index}`} className="p-4 rounded-lg bg-brand-dark-border space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    className="rounded-lg bg-brand-dark text-brand-text p-3"
                    placeholder="Full Name"
                    value={item.full_name}
                    onChange={(e) =>
                      setReferees((prev) =>
                        prev.map((entry, idx) =>
                          idx === index ? { ...entry, full_name: e.target.value } : entry
                        )
                      )
                    }
                  />
                  <input
                    className="rounded-lg bg-brand-dark text-brand-text p-3"
                    placeholder="Designation (e.g., Lecturer, Supervisor)"
                    value={item.designation}
                    onChange={(e) =>
                      setReferees((prev) =>
                        prev.map((entry, idx) =>
                          idx === index ? { ...entry, designation: e.target.value } : entry
                        )
                      )
                    }
                  />
                  <input
                    className="rounded-lg bg-brand-dark text-brand-text p-3"
                    placeholder="Organization"
                    value={item.organization}
                    onChange={(e) =>
                      setReferees((prev) =>
                        prev.map((entry, idx) =>
                          idx === index ? { ...entry, organization: e.target.value } : entry
                        )
                      )
                    }
                  />
                  <input
                    className="rounded-lg bg-brand-dark text-brand-text p-3"
                    placeholder="Email"
                    value={item.email}
                    onChange={(e) =>
                      setReferees((prev) =>
                        prev.map((entry, idx) =>
                          idx === index ? { ...entry, email: e.target.value } : entry
                        )
                      )
                    }
                  />
                </div>
                
                {/* Country Code and Phone Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-brand-text-muted text-sm mb-2 block">Country Code</label>
                    <select
                      className="rounded-lg bg-brand-dark text-brand-text p-3 w-full"
                      value={item.country_code || '+254'}
                      onChange={(e) =>
                        setReferees((prev) =>
                          prev.map((entry, idx) =>
                            idx === index ? { ...entry, country_code: e.target.value } : entry
                          )
                        )
                      }
                    >
                      {AFRICAN_COUNTRY_CODES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name} ({country.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-brand-text-muted text-sm mb-2 block">Phone Number (digits only)</label>
                    <input
                      className="rounded-lg bg-brand-dark text-brand-text p-3 w-full"
                      placeholder="e.g., 702123456"
                      value={item.phone || ''}
                      onChange={(e) => {
                        // Only allow digits
                        const digitsOnly = e.target.value.replace(/\D/g, '')
                        setReferees((prev) =>
                          prev.map((entry, idx) =>
                            idx === index ? { ...entry, phone: digitsOnly } : entry
                          )
                        )
                      }}
                      maxLength={15}
                    />
                    {item.phone && item.country_code && (
                      <p className="text-brand-text-muted text-xs mt-1">
                        Full: {item.country_code}{item.phone}
                      </p>
                    )}
                  </div>
                </div>

                {referees.length > 1 && (
                  <button
                    onClick={() => removeReferee(index)}
                    className="inline-flex items-center gap-2 text-brand-error hover:opacity-90 transition"
                  >
                    <Trash2 size={18} /> Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addReferee}
            className="text-brand-accent font-semibold hover:underline inline-flex items-center gap-2"
          >
            <Plus size={18} /> Add Another Referee
          </button>
        </div>

        {/* Certifications */}
        <div className="card-dark p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="text-brand-primary" size={22} />
            <h2 className="text-xl font-semibold text-brand-text">Certifications</h2>
          </div>

          <div className="space-y-4">
            {certifications.map((item, index) => (
              <div key={`cert-${index}`} className="p-4 rounded-lg bg-brand-dark-border space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    className="rounded-lg bg-brand-dark text-brand-text p-3"
                    placeholder="Certification Name"
                    value={item.name}
                    onChange={(e) =>
                      setCertifications((prev) =>
                        prev.map((entry, idx) =>
                          idx === index ? { ...entry, name: e.target.value } : entry
                        )
                      )
                    }
                  />
                  <input
                    className="rounded-lg bg-brand-dark text-brand-text p-3"
                    placeholder="Issuer (e.g., Coursera, KASNEB)"
                    value={item.issuer}
                    onChange={(e) =>
                      setCertifications((prev) =>
                        prev.map((entry, idx) =>
                          idx === index ? { ...entry, issuer: e.target.value } : entry
                        )
                      )
                    }
                  />
                  <select
                    className="rounded-lg bg-brand-dark text-brand-text p-3"
                    value={item.year}
                    onChange={(e) =>
                      setCertifications((prev) =>
                        prev.map((entry, idx) =>
                          idx === index ? { ...entry, year: e.target.value } : entry
                        )
                      )
                    }
                  >
                    <option value="">Select Year</option>
                    {yearOptions.map((year) => (
                      <option key={year} value={String(year)}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <input
                    className="rounded-lg bg-brand-dark text-brand-text p-3"
                    placeholder="Credential ID (optional)"
                    value={item.credential_id || ''}
                    onChange={(e) =>
                      setCertifications((prev) =>
                        prev.map((entry, idx) =>
                          idx === index ? { ...entry, credential_id: e.target.value } : entry
                        )
                      )
                    }
                  />
                  <div className="md:col-span-2">
                    <input
                      className="w-full rounded-lg bg-brand-dark text-brand-text p-3"
                      placeholder="Credential URL (e.g., Google Drive link)"
                      value={item.credential_url || ''}
                      onChange={(e) =>
                        setCertifications((prev) =>
                          prev.map((entry, idx) =>
                            idx === index ? { ...entry, credential_url: e.target.value } : entry
                          )
                        )
                      }
                    />
                    <p className="text-xs text-brand-text-muted mt-1.5 flex items-start gap-1">
                      <span className="text-brand-accent">💡</span>
                      <span>
                        <strong>Tip:</strong> Upload your certificate to{' '}
                        <a 
                          href="https://drive.google.com" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-brand-primary hover:text-brand-primary-light underline"
                        >
                          Google Drive
                        </a>
                        , set sharing to "Anyone with the link", and paste the link here for easy verification.
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary/20 text-brand-primary font-medium cursor-pointer">
                    Upload Certificate
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleCertificateUpload(index, file)
                        }
                      }}
                    />
                  </label>
                  {item.file_path && (
                    <span className="text-xs text-brand-text-muted">
                      Uploaded: {item.file_path.split('/').slice(-1)[0]}
                    </span>
                  )}
                </div>

                {certifications.length > 1 && (
                  <button
                    onClick={() => removeCertification(index)}
                    className="inline-flex items-center gap-2 text-brand-error hover:opacity-90 transition"
                  >
                    <Trash2 size={18} /> Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addCertification}
            className="text-brand-accent font-semibold hover:underline inline-flex items-center gap-2"
          >
            <Plus size={18} /> Add Another Certification
          </button>
        </div>
        </div>
      )}
    </DashboardLayout>
  )
}
