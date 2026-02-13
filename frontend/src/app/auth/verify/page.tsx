'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import Link from 'next/link'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token provided')
      return
    }

    const verifyEmail = async () => {
      try {
        await apiClient.verifyEmail(token)
        setStatus('success')
        setMessage('Email verified successfully!')

        // Redirect to login after 2 seconds
        setTimeout(() => router.push('/auth/login'), 2000)
      } catch (err: any) {
        setStatus('error')
        setMessage(
          err.response?.data?.detail ||
          err.response?.data?.error?.detail ||
          'Failed to verify email. The link may have expired.'
        )
      }
    }

    verifyEmail()
  }, [token, router])

  return (
    <div className="min-h-screen bg-gradient-dark bg-gradient-mesh flex items-center justify-center px-4 py-12">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-brand-primary/20 rounded-full filter blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-brand-accent/20 rounded-full filter blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <div className="text-4xl font-display font-bold bg-gradient-brand bg-clip-text text-transparent">LeAI</div>
          </div>
          <h1 className="text-3xl font-display font-bold text-brand-text mb-2">Verify Your Email</h1>
        </div>

        {/* Card */}
        <div className="card-dark p-8 space-y-6 text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-primary/20 animate-spin">
                  <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent" />
                </div>
              </div>
              <p className="text-brand-text-muted">Verifying your email...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-success/20">
                  <svg
                    className="w-6 h-6 text-brand-success"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-brand-text">{message}</h2>
              <p className="text-sm text-brand-text-muted">Redirecting to login...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20">
                  <svg
                    className="w-6 h-6 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-brand-text">Verification Failed</h2>
              <p className="text-sm text-brand-text-muted mb-6">{message}</p>
              <div className="space-y-3">
                <Link
                  href="/auth/login"
                  className="block w-full px-4 py-2 bg-brand-primary text-white rounded-lg font-semibold hover:bg-brand-primary-dark transition-colors"
                >
                  Back to Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="block w-full px-4 py-2 border border-brand-dark-border text-brand-text rounded-lg font-semibold hover:bg-brand-dark-card transition-colors"
                >
                  Create New Account
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-dark bg-gradient-mesh flex items-center justify-center px-4 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mx-auto"></div>
          <p className="text-brand-text-muted mt-4">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
