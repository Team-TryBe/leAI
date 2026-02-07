import axios, { AxiosInstance, AxiosError } from 'axios'
import { getAuthToken, setAuthToken, removeAuthToken } from './auth'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: `${BACKEND_URL}/api/v1`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      const token = getAuthToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          removeAuthToken()
          // Redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login'
          }
        }
        return Promise.reject(error)
      }
    )
  }

  // Auth endpoints
  async signup(data: {
    email: string
    full_name: string
    password: string
  }) {
    return this.client.post('/auth/signup', data)
  }

  async login(data: { email: string; password: string }) {
    return this.client.post('/auth/login', data)
  }

  async verifyEmail(token: string) {
    return this.client.get('/auth/verify-email', { params: { token } })
  }

  async requestPasswordReset(email: string) {
    return this.client.post('/auth/forgot-password', { email })
  }

    async forgotPassword(email: string) {
      return this.client.post('/auth/forgot-password', { email })
    }

  async resetPassword(token: string, new_password: string) {
    return this.client.post('/auth/reset-password', { token, new_password })
  }

  async googleAuth(id_token: string) {
    return this.client.post('/auth/google', { id_token })
  }

  // User endpoints
  async getCurrentUser() {
    return this.client.get('/users/me')
  }

  async updateProfile(data: Record<string, any>) {
    return this.client.put('/users/me', data)
  }

  // Job application endpoints
  async submitJobUrl(jobUrl: string, notes?: string) {
    return this.client.post('/applications', {
      job_url: jobUrl,
      notes,
    })
  }

  async getApplications(skip = 0, limit = 10) {
    return this.client.get('/applications', { params: { skip, limit } })
  }

  async getApplicationById(id: number) {
    return this.client.get(`/applications/${id}`)
  }

  async getApplicationStatus(id: number) {
    return this.client.get(`/applications/${id}/status`)
  }

  async updateApplicationStatus(id: number, status: string) {
    return this.client.patch(`/applications/${id}/status`, { status })
  }

  // Material generation endpoints
  async generateCV(applicationId: number) {
    return this.client.post(`/applications/${applicationId}/generate-cv`)
  }

  async generateCoverLetter(applicationId: number) {
    return this.client.post(`/applications/${applicationId}/generate-cover-letter`)
  }

  async generateOutreach(applicationId: number, includeEmail = true, includeLinkedin = true) {
    return this.client.post(`/applications/${applicationId}/generate-outreach`, {
      include_email: includeEmail,
      include_linkedin: includeLinkedin,
    })
  }

  // PDF download
  async downloadCV(applicationId: number) {
    return this.client.get(`/applications/${applicationId}/download-cv`, {
      responseType: 'blob',
    })
  }

  // Master profile endpoints
  async getMasterProfile() {
    return this.client.get('/master-profile')
  }

  async updateMasterProfile(data: Record<string, any>) {
    return this.client.put('/master-profile', data)
  }

  // CV Personalizer endpoints
  async getMatchScore(jobId: number | string) {
    return this.client.get(`/cv-personalizer/match-score/${jobId}`)
  }

  async personalizeCv(jobId: number | string) {
    return this.client.post(
      '/cv-personalizer/personalize',
      { job_id: jobId },
      { timeout: 120000 }
    )
  }
}

export const apiClient = new ApiClient()
