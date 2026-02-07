'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { 
  Sparkles, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  FileText, 
  Upload, 
  Loader2,
  CheckCircle2,
  XCircle,
  Globe,
  Clock,
  MapPin,
  Building2,
  DollarSign,
  Briefcase,
  AlertCircle,
  X,
  Save,
  Zap
} from 'lucide-react'
import { getAuthToken } from '@/lib/auth'

type ExtractionMode = 'url' | 'image' | 'text'

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
}

export default function JobExtractorPage() {
  const router = useRouter()
  const [mode, setMode] = useState<ExtractionMode>('url')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null)
  const [profileMissingFields, setProfileMissingFields] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [savedJobs, setSavedJobs] = useState<ExtractedJob[]>([])
  const [loadingSavedJobs, setLoadingSavedJobs] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'extract' | 'saved'>('extract')

  // Form inputs
  const [url, setUrl] = useState('')
  const [rawText, setRawText] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  useEffect(() => {
    checkProfileCompleteness()
    fetchSavedJobs()
  }, [])

  const checkProfileCompleteness = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch('http://127.0.0.1:8000/api/v1/master-profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        const profile = result.data

        const missing: string[] = []
        if (!profile.full_name) missing.push('Full Name')
        if (!profile.email) missing.push('Email')
        if (!profile.phone_number) missing.push('Phone Number')
        if (!profile.location) missing.push('Location')
        if (!profile.personal_statement && !profile.professional_summary) missing.push('Personal Statement')
        if (!profile.education || profile.education.length === 0) missing.push('Education')
        if ((!profile.experience || profile.experience.length === 0) &&
            (!profile.work_experience || profile.work_experience.length === 0) &&
            (!profile.projects || profile.projects.length === 0)) {
          missing.push('Work Experience or Projects')
        }
        if ((!profile.technical_skills || profile.technical_skills.length === 0) &&
            (!profile.skills || profile.skills.length === 0)) {
          missing.push('Skills')
        }

        setProfileComplete(missing.length === 0)
        setProfileMissingFields(missing)
      }
    } catch (err) {
      console.error('Failed to check profile:', err)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newFiles = Array.from(files).slice(0, 3 - imageFiles.length)
      const updatedFiles = [...imageFiles, ...newFiles]
      setImageFiles(updatedFiles.slice(0, 3))

      const newPreviews: string[] = []
      let loadedCount = 0
      newFiles.forEach((file) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          newPreviews.push(reader.result as string)
          loadedCount++
          if (loadedCount === newFiles.length) {
            setImagePreviews([...imagePreviews, ...newPreviews].slice(0, 3))
          }
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeImage = (index: number) => {
    const updatedFiles = imageFiles.filter((_, i) => i !== index)
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index)
    setImageFiles(updatedFiles)
    setImagePreviews(updatedPreviews)
  }

  const fetchSavedJobs = async (query?: string) => {
    setLoadingSavedJobs(true)
    try {
      const token = getAuthToken()
      if (!token) return

      const fetchUrl = query
        ? `http://127.0.0.1:8000/api/v1/job-extractor/search?query=${encodeURIComponent(query)}`
        : 'http://127.0.0.1:8000/api/v1/job-extractor/recent'

      const response = await fetch(fetchUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setSavedJobs(result.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch saved jobs:', err)
    } finally {
      setLoadingSavedJobs(false)
    }
  }

  const handleSearchSavedJobs = () => {
    if (searchQuery.trim()) {
      fetchSavedJobs(searchQuery)
    } else {
      fetchSavedJobs()
    }
  }

  const handleExtract = async () => {
    setIsExtracting(true)
    setError(null)
    setExtractedData(null)

    if (profileComplete === false) {
      setError(
        `⚠️ Master Profile Incomplete!\n\n` +
        `Please complete your Master Profile before extracting job postings.\n\n` +
        `Missing fields:\n${profileMissingFields.map((f) => `• ${f}`).join('\n')}`
      )
      setIsExtracting(false)
      router.push('/dashboard/master-profile')
      return
    }

    try {
      const token = getAuthToken()
      if (!token) {
        setError('Authentication required. Please log in.')
        setIsExtracting(false)
        return
      }

      const formData = new FormData()

      if (mode === 'url' && url) {
        formData.append('url', url)
      } else if (mode === 'image' && imageFiles.length > 0) {
        imageFiles.forEach((file, index) => {
          formData.append(`image`, file)
        })
      } else if (mode === 'text' && rawText) {
        formData.append('raw_text', rawText)
      } else {
        setError('Please provide input for extraction')
        setIsExtracting(false)
        return
      }

      const response = await fetch('http://127.0.0.1:8000/api/v1/job-extractor/extract', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        
          // Check if this is a master profile incomplete error
          if (response.status === 403 && errorData.detail?.error === 'master_profile_incomplete') {
            const missingFields = errorData.detail.missing_fields || []
            setError(
              `⚠️ Master Profile Incomplete!\n\n` +
              `Please complete your Master Profile before extracting job postings.\n\n` +
              `Missing fields:\n${missingFields.map((f: string) => `• ${f}`).join('\n')}\n\n` +
              `Redirecting to Master Profile page...`
            )
            setIsExtracting(false)
          
            // Auto-redirect after 3 seconds
            setTimeout(() => {
              router.push('/dashboard/master-profile')
            }, 3000)
            return
          }
        
        throw new Error(errorData.detail || 'Extraction failed')
      }

      const result = await response.json()
      setExtractedData(result.data)
    } catch (err: any) {
      setError(err.message || 'Failed to extract job data')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleSaveJobDescription = async () => {
    if (!extractedData) return

    // The extraction is already saved to the backend when extracted
    // This function simply confirms the save and provides next steps
    setIsSaving(true)
    setSaveSuccess(true)

    setTimeout(() => {
      // Reset to allow extracting another job
      resetForm()
      setIsSaving(false)
    }, 2000)
  }

  const handleUseForApplication = () => {
    if (!extractedData?.id) return
    // Navigate to create a new application with this extracted job data
    router.push(`/dashboard/applications/new?job_id=${extractedData.id}`)
  }

  const resetForm = () => {
    setUrl('')
    setRawText('')
    setImageFiles([])
    setImagePreviews([])
    setExtractedData(null)
    setError(null)
    setSaveSuccess(false)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-purple-500/10 border border-indigo-500/20 p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-brand-text">Aditus Engine</h1>
                <p className="text-xs text-brand-text-muted mt-1">
                  Extract structured job data from URLs, screenshots, or manual text using AI
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-brand-dark-border">
          <button
            onClick={() => setActiveTab('extract')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'extract'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-text-muted hover:text-brand-text'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={16} />
              <span>Extract New Job</span>
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('saved')
              if (savedJobs.length === 0) {
                fetchSavedJobs()
              }
            }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'saved'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-text-muted hover:text-brand-text'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText size={16} />
              <span>Saved Jobs ({savedJobs.length})</span>
            </div>
          </button>
        </div>

        {activeTab === 'extract' && (
          <div className="space-y-6">
            {profileComplete === false && (
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative rounded-xl bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-amber-500/10 border border-yellow-500/30 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="space-y-3 flex-1">
                  <h3 className="text-lg font-semibold text-yellow-300">Complete your Master Profile first</h3>
                  <p className="text-yellow-200/80 text-sm">
                    You must finish your Master Profile before extracting job postings.
                  </p>
                  {profileMissingFields.length > 0 && (
                    <ul className="text-yellow-200/70 text-sm space-y-1">
                      {profileMissingFields.map((field) => (
                        <li key={field} className="flex items-start gap-2">
                          <span className="text-yellow-400 mt-0.5">•</span>
                          <span>{field}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => router.push('/dashboard/master-profile')}
                    className="mt-3 px-5 py-2.5 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-yellow-500/25 transition-all duration-300"
                  >
                    Go to Master Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mode Selector */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
          <div className="relative card-dark p-6 rounded-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <h2 className="text-base font-semibold text-brand-text">Choose Input Method</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => { setMode('url'); resetForm() }}
                className={`relative p-6 rounded-lg border-2 transition-all duration-200 ${
                  mode === 'url'
                    ? 'border-indigo-500/50 bg-gradient-to-br from-indigo-500/10 to-violet-500/10'
                    : 'border-brand-dark-border hover:border-indigo-500/30 hover:bg-indigo-500/5'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    mode === 'url' ? 'bg-gradient-to-br from-indigo-500 to-violet-500' : 'bg-brand-dark-border'
                  }`}>
                    <LinkIcon className="text-white" size={20} />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-brand-text text-sm">Job URL</h3>
                    <p className="text-xs text-brand-text-muted mt-1">
                      BrighterMonday, Fuzu, LinkedIn, etc.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setMode('image'); resetForm() }}
                className={`relative p-6 rounded-lg border-2 transition-all duration-200 ${
                  mode === 'image'
                    ? 'border-indigo-500/50 bg-gradient-to-br from-indigo-500/10 to-violet-500/10'
                    : 'border-brand-dark-border hover:border-indigo-500/30 hover:bg-indigo-500/5'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    mode === 'image' ? 'bg-gradient-to-br from-indigo-500 to-violet-500' : 'bg-brand-dark-border'
                  }`}>
                    <ImageIcon className="text-white" size={20} />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-brand-text text-sm">Screenshot</h3>
                    <p className="text-xs text-brand-text-muted mt-1">
                      WhatsApp, Instagram, Physical poster
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setMode('text'); resetForm() }}
                className={`relative p-6 rounded-lg border-2 transition-all duration-200 ${
                  mode === 'text'
                    ? 'border-indigo-500/50 bg-gradient-to-br from-indigo-500/10 to-violet-500/10'
                    : 'border-brand-dark-border hover:border-indigo-500/30 hover:bg-indigo-500/5'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    mode === 'text' ? 'bg-gradient-to-br from-indigo-500 to-violet-500' : 'bg-brand-dark-border'
                  }`}>
                    <FileText className="text-white" size={20} />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-brand-text text-sm">Manual Text</h3>
                    <p className="text-xs text-brand-text-muted mt-1">
                      Copy & paste job description
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
          <div className="relative card-dark p-6 rounded-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-cyan-400" />
              </div>
              <h2 className="text-base font-semibold text-brand-text">Input Job Data</h2>
            </div>

            {mode === 'url' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-brand-text-muted uppercase tracking-wider">Job Posting URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://brightermonday.co.ke/job/..."
                  className="w-full rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
                />
                <p className="text-xs text-brand-text-muted mt-1">
                  Supported: BrighterMonday, Fuzu, MyJobMag, LinkedIn, and most job boards
                </p>
              </div>
            )}

            {mode === 'image' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-brand-text-muted uppercase tracking-wider">Upload Screenshots (up to 3)</label>
                  <span className="text-xs text-brand-text-muted">{imagePreviews.length}/3</span>
                </div>
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group/img">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-40 object-cover rounded-lg border border-brand-dark-border"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 text-white opacity-0 group-hover/img:opacity-100 transition hover:bg-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {imagePreviews.length < 3 && (
                  <div className="border-2 border-dashed border-brand-dark-border rounded-lg p-8 text-center hover:border-indigo-500/30 transition">
                    <label className="cursor-pointer">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
                          <Upload className="text-indigo-400" size={32} />
                        </div>
                        <div>
                          <p className="text-brand-text font-medium text-sm">Click to add more</p>
                          <p className="text-xs text-brand-text-muted mt-1">PNG, JPG up to 10MB</p>
                        </div>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {mode === 'text' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-brand-text-muted uppercase tracking-wider">Job Description Text</label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste the full job description here..."
                  rows={12}
                  className="w-full rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
                />
              </div>
            )}

            {/* Extract Button */}
            <button
              onClick={handleExtract}
              disabled={isExtracting || (mode === 'url' && !url) || (mode === 'image' && imageFiles.length === 0) || (mode === 'text' && !rawText)}
              className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Extracting with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Extract Job Data</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-xl blur opacity-75"></div>
            <div className="relative rounded-xl bg-gradient-to-br from-red-500/10 via-rose-500/5 to-red-500/10 border border-red-500/30 p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-400 text-base">Extraction Failed</h3>
                  <p className="text-sm text-red-300/80 mt-2">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Extracted Data Display */}
        {extractedData && (
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl blur opacity-75"></div>
            <div className="relative rounded-xl bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10 border border-green-500/30 p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-green-400">Extraction Successful</h2>
                </div>
                <button
                  onClick={resetForm}
                  className="text-sm text-green-400 hover:text-green-300 transition"
                >
                  Extract Another
                </button>
              </div>

              {/* Job Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-brand-dark-border border border-green-500/20">
                  <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Job Title</p>
                  <p className="text-base font-semibold text-brand-text">{extractedData.job_title}</p>
                </div>
                <div className="p-4 rounded-lg bg-brand-dark-border border border-green-500/20">
                  <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Company</p>
                  <p className="text-base font-semibold text-brand-text flex items-center gap-2">
                    <Building2 size={16} />
                    {extractedData.company_name}
                  </p>
                </div>
              </div>

              {/* Job Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {extractedData.location && (
                  <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                    <div className="flex items-center gap-2 text-cyan-400 mb-1">
                      <MapPin size={14} />
                      <span className="text-xs font-medium">Location</span>
                    </div>
                    <p className="text-sm text-brand-text">{extractedData.location}</p>
                  </div>
                )}
                {extractedData.job_level && (
                  <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 text-purple-400 mb-1">
                      <Briefcase size={14} />
                      <span className="text-xs font-medium">Level</span>
                    </div>
                    <p className="text-sm text-brand-text">{extractedData.job_level}</p>
                  </div>
                )}
                {extractedData.employment_type && (
                  <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20">
                    <div className="flex items-center gap-2 text-orange-400 mb-1">
                      <Clock size={14} />
                      <span className="text-xs font-medium">Type</span>
                    </div>
                    <p className="text-sm text-brand-text">{extractedData.employment_type}</p>
                  </div>
                )}
                {extractedData.salary_range && (
                  <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-emerald-400 mb-1">
                      <DollarSign size={14} />
                      <span className="text-xs font-medium">Salary</span>
                    </div>
                    <p className="text-sm text-brand-text">{extractedData.salary_range}</p>
                  </div>
                )}
              </div>

              {/* Requirements */}
              {extractedData.key_requirements?.length > 0 && (
                <div className="p-4 rounded-lg bg-brand-dark-border border border-green-500/20 space-y-3">
                  <h3 className="font-semibold text-brand-text text-sm">Key Requirements</h3>
                  <ul className="space-y-2">
                    {extractedData.key_requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-brand-text-muted">
                        <span className="text-green-400 mt-0.5">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preferred Skills */}
              {extractedData.preferred_skills?.length > 0 && (
                <div className="p-4 rounded-lg bg-brand-dark-border border border-green-500/20 space-y-3">
                  <h3 className="font-semibold text-brand-text text-sm">Preferred Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {extractedData.preferred_skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 text-xs font-medium border border-green-500/30"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Job Description */}
              {extractedData.job_description && (
                <div className="p-4 rounded-lg bg-brand-dark-border border border-green-500/20 space-y-3">
                  <h3 className="font-semibold text-brand-text text-sm">Full Description</h3>
                  <p className="text-sm text-brand-text-muted whitespace-pre-line leading-relaxed">
                    {extractedData.job_description}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-4 border-t border-green-500/20">
                {saveSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <CheckCircle2 size={16} className="text-green-400" />
                    <span className="text-sm text-green-400">Job description saved successfully!</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={handleSaveJobDescription}
                    disabled={isSaving || saveSuccess}
                    className="py-2.5 px-4 rounded-lg bg-gradient-to-r from-brand-primary to-brand-accent text-white font-semibold hover:shadow-lg hover:shadow-brand-primary/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : saveSuccess ? (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save Job Description</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleUseForApplication}
                    className="py-2.5 px-4 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <FileText size={16} />
                    <span>Use for Application</span>
                  </button>
                </div>
                <button
                  onClick={resetForm}
                  className="w-full px-4 py-2.5 rounded-lg border border-brand-dark-border text-brand-text hover:bg-brand-dark-border transition"
                >
                  Extract Another
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="card-dark p-6 border-l-4 border-brand-accent">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-brand-accent flex-shrink-0" size={20} />
            <div className="space-y-2">
              <h3 className="font-semibold text-brand-text">How It Works</h3>
              <ul className="text-sm text-brand-text-muted space-y-1">
                <li>• <strong>URL:</strong> Automatically scrapes BrighterMonday, Fuzu, LinkedIn & more</li>
                <li>• <strong>Screenshot:</strong> Uses AI vision to extract data from images (WhatsApp, Instagram)</li>
                <li>• <strong>Manual:</strong> Paste job text from PDFs or physical posters</li>
                <li>• AI extracts requirements, skills, and application details for tailored CV generation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
        )}

        {/* Saved Jobs Tab */}
        {activeTab === 'saved' && (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search saved jobs by title, company, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchSavedJobs()}
                className="flex-1 rounded-lg bg-brand-dark-border border border-brand-dark-border text-brand-text p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
              />
              <button
                onClick={handleSearchSavedJobs}
                className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold hover:shadow-lg transition"
              >
                Search
              </button>
              <button
                onClick={() => {
                  setSearchQuery('')
                  fetchSavedJobs()
                }}
                className="px-4 py-2.5 rounded-lg border border-brand-dark-border text-brand-text text-sm font-medium hover:bg-brand-dark-border transition"
              >
                Clear
              </button>
            </div>

            {/* Loading State */}
            {loadingSavedJobs && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin mr-2" size={20} />
                <span className="text-brand-text-muted">Loading saved jobs...</span>
              </div>
            )}

            {/* Saved Jobs List */}
            {!loadingSavedJobs && savedJobs.length > 0 && (
              <div className="space-y-3">
                {savedJobs.map((job) => (
                  <div key={job.id} className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
                    <div className="relative card-dark p-5 rounded-xl space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <h3 className="font-semibold text-brand-text text-lg">{job.job_title}</h3>
                          <p className="text-sm text-brand-text-muted flex items-center gap-2">
                            <Building2 size={14} />
                            {job.company_name}
                          </p>
                          {job.location && (
                            <p className="text-sm text-brand-text-muted flex items-center gap-2">
                              <MapPin size={14} />
                              {job.location}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-brand-text-muted">
                          {job.id ? `ID: ${job.id}` : 'Unsaved'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {job.job_level && (
                          <div className="text-xs">
                            <span className="text-brand-text-muted">Level:</span>
                            <p className="text-brand-text font-medium">{job.job_level}</p>
                          </div>
                        )}
                        {job.employment_type && (
                          <div className="text-xs">
                            <span className="text-brand-text-muted">Type:</span>
                            <p className="text-brand-text font-medium">{job.employment_type}</p>
                          </div>
                        )}
                        {job.salary_range && (
                          <div className="text-xs">
                            <span className="text-brand-text-muted">Salary:</span>
                            <p className="text-brand-text font-medium">{job.salary_range}</p>
                          </div>
                        )}
                        {job.application_deadline && (
                          <div className="text-xs">
                            <span className="text-brand-text-muted">Deadline:</span>
                            <p className="text-brand-text font-medium">{job.application_deadline}</p>
                          </div>
                        )}
                      </div>

                      {job.key_requirements && job.key_requirements.length > 0 && (
                        <div className="pt-2 border-t border-brand-dark-border">
                          <p className="text-xs text-brand-text-muted mb-2">Key Requirements:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {job.key_requirements.slice(0, 4).map((req, idx) => (
                              <span key={idx} className="px-2 py-1 rounded text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {req}
                              </span>
                            ))}
                            {job.key_requirements.length > 4 && (
                              <span className="px-2 py-1 rounded text-xs text-brand-text-muted">+{job.key_requirements.length - 4} more</span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-3 border-t border-brand-dark-border">
                        <button
                          onClick={() => router.push(`/dashboard/saved-jobs/${job.id}`)}
                          className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-brand-primary to-brand-accent text-white text-xs font-medium hover:shadow-lg transition flex items-center justify-center gap-1.5"
                        >
                          <FileText size={14} />
                          View Details
                        </button>
                        <button
                          onClick={() => {
                            console.log('Starting CV personalization for job:', job.id);
                            router.push(`/dashboard/applications/new?job_id=${job.id}&extracted=true`);
                          }}
                          className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-medium hover:shadow-lg transition flex items-center justify-center gap-1.5"
                        >
                          <Zap size={14} />
                          Personalize CV
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loadingSavedJobs && savedJobs.length === 0 && (
              <div className="flex items-center justify-center py-12 rounded-lg border-2 border-dashed border-brand-dark-border">
                <div className="text-center">
                  <FileText size={32} className="text-brand-text-muted mx-auto mb-3 opacity-50" />
                  <p className="text-brand-text-muted mb-1">No saved jobs yet</p>
                  <p className="text-xs text-brand-text-muted">Extract and save jobs to see them here</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
