'use client'

import { useState } from 'react'
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
  AlertCircle
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

  // Form inputs
  const [url, setUrl] = useState('')
  const [rawText, setRawText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleExtract = async () => {
    setIsExtracting(true)
    setError(null)
    setExtractedData(null)

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
      } else if (mode === 'image' && imageFile) {
        formData.append('image', imageFile)
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

  const resetForm = () => {
    setUrl('')
    setRawText('')
    setImageFile(null)
    setImagePreview(null)
    setExtractedData(null)
    setError(null)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Sparkles className="text-brand-primary" size={32} />
            <h1 className="text-4xl font-display font-bold text-brand-text">Aditus Engine</h1>
          </div>
          <p className="text-brand-text-muted">
            Extract structured job data from URLs, screenshots, or manual text using AI
          </p>
        </div>

        {/* Mode Selector */}
        <div className="card-dark p-6 space-y-4">
          <h2 className="text-lg font-semibold text-brand-text">Choose Input Method</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => { setMode('url'); resetForm() }}
              className={`p-6 rounded-lg border-2 transition-all duration-200 ${
                mode === 'url'
                  ? 'border-brand-primary bg-brand-primary/10'
                  : 'border-brand-dark-border hover:border-brand-primary/50'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  mode === 'url' ? 'bg-brand-primary' : 'bg-brand-dark-border'
                }`}>
                  <LinkIcon className="text-white" size={24} />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-brand-text">Job URL</h3>
                  <p className="text-xs text-brand-text-muted mt-1">
                    BrighterMonday, Fuzu, LinkedIn, etc.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => { setMode('image'); resetForm() }}
              className={`p-6 rounded-lg border-2 transition-all duration-200 ${
                mode === 'image'
                  ? 'border-brand-primary bg-brand-primary/10'
                  : 'border-brand-dark-border hover:border-brand-primary/50'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  mode === 'image' ? 'bg-brand-primary' : 'bg-brand-dark-border'
                }`}>
                  <ImageIcon className="text-white" size={24} />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-brand-text">Screenshot</h3>
                  <p className="text-xs text-brand-text-muted mt-1">
                    WhatsApp, Instagram, Physical poster
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => { setMode('text'); resetForm() }}
              className={`p-6 rounded-lg border-2 transition-all duration-200 ${
                mode === 'text'
                  ? 'border-brand-primary bg-brand-primary/10'
                  : 'border-brand-dark-border hover:border-brand-primary/50'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  mode === 'text' ? 'bg-brand-primary' : 'bg-brand-dark-border'
                }`}>
                  <FileText className="text-white" size={24} />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-brand-text">Manual Text</h3>
                  <p className="text-xs text-brand-text-muted mt-1">
                    Copy & paste job description
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Input Form */}
        <div className="card-dark p-6 space-y-6">
          <h2 className="text-lg font-semibold text-brand-text">Input Job Data</h2>

          {mode === 'url' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-brand-text">Job Posting URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://brightermonday.co.ke/job/..."
                className="w-full rounded-lg bg-brand-dark text-brand-text p-3 border border-brand-dark-border focus:border-brand-primary focus:outline-none"
              />
              <p className="text-xs text-brand-text-muted">
                Supported: BrighterMonday, Fuzu, MyJobMag, LinkedIn, and most job boards
              </p>
            </div>
          )}

          {mode === 'image' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-brand-text">Upload Screenshot</label>
              <div className="border-2 border-dashed border-brand-dark-border rounded-lg p-8 text-center">
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setImageFile(null)
                        setImagePreview(null)
                      }}
                      className="text-brand-error text-sm hover:underline"
                    >
                      Remove image
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="text-brand-text-muted" size={48} />
                      <div>
                        <p className="text-brand-text font-medium">Click to upload</p>
                        <p className="text-sm text-brand-text-muted">PNG, JPG up to 10MB</p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {mode === 'text' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-brand-text">Job Description Text</label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste the full job description here..."
                rows={12}
                className="w-full rounded-lg bg-brand-dark text-brand-text p-3 border border-brand-dark-border focus:border-brand-primary focus:outline-none"
              />
            </div>
          )}

          {/* Extract Button */}
          <button
            onClick={handleExtract}
            disabled={isExtracting || (!url && !imageFile && !rawText)}
            className="w-full py-3 px-6 rounded-lg bg-brand-primary text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isExtracting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Extracting with AI...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Extract Job Data
              </>
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="card-dark p-4 border-l-4 border-brand-error bg-brand-error/10">
            <div className="flex items-start gap-3">
              <XCircle className="text-brand-error flex-shrink-0" size={20} />
              <div>
                <h3 className="font-semibold text-brand-error">Extraction Failed</h3>
                <p className="text-sm text-brand-text-muted mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Extracted Data Display */}
        {extractedData && (
          <div className="card-dark p-6 space-y-6 border-l-4 border-brand-success">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-brand-success" size={24} />
                <h2 className="text-xl font-semibold text-brand-text">Extraction Successful</h2>
              </div>
              <button
                onClick={resetForm}
                className="text-sm text-brand-accent hover:underline"
              >
                Extract Another
              </button>
            </div>

            {/* Job Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-brand-text-muted">Job Title</p>
                <p className="text-lg font-semibold text-brand-text">{extractedData.job_title}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-brand-text-muted">Company</p>
                <p className="text-lg font-semibold text-brand-text flex items-center gap-2">
                  <Building2 size={18} />
                  {extractedData.company_name}
                </p>
              </div>
            </div>

            {/* Job Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {extractedData.location && (
                <div className="p-3 rounded-lg bg-brand-dark-border">
                  <div className="flex items-center gap-2 text-brand-text-muted mb-1">
                    <MapPin size={16} />
                    <span className="text-xs">Location</span>
                  </div>
                  <p className="text-sm font-medium text-brand-text">{extractedData.location}</p>
                </div>
              )}
              {extractedData.job_level && (
                <div className="p-3 rounded-lg bg-brand-dark-border">
                  <div className="flex items-center gap-2 text-brand-text-muted mb-1">
                    <Briefcase size={16} />
                    <span className="text-xs">Level</span>
                  </div>
                  <p className="text-sm font-medium text-brand-text">{extractedData.job_level}</p>
                </div>
              )}
              {extractedData.employment_type && (
                <div className="p-3 rounded-lg bg-brand-dark-border">
                  <div className="flex items-center gap-2 text-brand-text-muted mb-1">
                    <Clock size={16} />
                    <span className="text-xs">Type</span>
                  </div>
                  <p className="text-sm font-medium text-brand-text">{extractedData.employment_type}</p>
                </div>
              )}
              {extractedData.salary_range && (
                <div className="p-3 rounded-lg bg-brand-dark-border">
                  <div className="flex items-center gap-2 text-brand-text-muted mb-1">
                    <DollarSign size={16} />
                    <span className="text-xs">Salary</span>
                  </div>
                  <p className="text-sm font-medium text-brand-text">{extractedData.salary_range}</p>
                </div>
              )}
            </div>

            {/* Requirements */}
            {extractedData.key_requirements?.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-brand-text">Key Requirements</h3>
                <ul className="space-y-2">
                  {extractedData.key_requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-brand-text-muted">
                      <span className="text-brand-primary mt-1">•</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preferred Skills */}
            {extractedData.preferred_skills?.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-brand-text">Preferred Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {extractedData.preferred_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-brand-primary/20 text-brand-primary text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Job Description */}
            {extractedData.job_description && (
              <div className="space-y-3">
                <h3 className="font-semibold text-brand-text">Full Description</h3>
                <p className="text-sm text-brand-text-muted whitespace-pre-line">
                  {extractedData.job_description}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-brand-dark-border">
              <button
                onClick={() => router.push(`/dashboard/applications/new?extracted=true&job_id=${extractedData.id}`)}
                className="flex-1 py-2 px-4 rounded-lg bg-brand-primary text-white font-semibold hover:opacity-90 transition"
              >
                Start Application
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-lg border border-brand-dark-border text-brand-text hover:bg-brand-dark-border transition"
              >
                Extract Another
              </button>
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
    </DashboardLayout>
  )
}
