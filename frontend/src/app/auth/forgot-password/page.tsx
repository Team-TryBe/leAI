'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiClient } from '@/lib/api'
import { Input, Button, Alert } from '@/components/ui'
import Link from 'next/link'

const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
    mode: 'onSubmit',
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true)
    setError(null)

    try {
      await apiClient.forgotPassword(data.email)
      setSubmitted(true)
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.error?.detail ||
        'Failed to process request'
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
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
            <h1 className="text-3xl font-display font-bold text-brand-text mb-2">Check Your Email</h1>
          </div>

          {/* Card */}
          <div className="card-dark p-8 space-y-6">
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>

            <div className="text-center space-y-3">
              <h2 className="text-xl font-semibold text-brand-text">Reset link sent</h2>
              <p className="text-sm text-brand-text-muted">
                If an account exists with this email, you'll receive a password reset link shortly.
              </p>
              <p className="text-xs text-brand-text-muted">
                The link will expire in 1 hour.
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <Link
                href="/auth/login"
                className="block w-full px-4 py-2 bg-brand-primary text-white rounded-lg font-semibold hover:bg-brand-primary-dark transition-colors text-center"
              >
                Back to Login
              </Link>
              <Link
                href="/auth/signup"
                className="block w-full px-4 py-2 border border-brand-dark-border text-brand-text rounded-lg font-semibold hover:bg-brand-dark-card transition-colors text-center"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
          <h1 className="text-3xl font-display font-bold text-brand-text mb-2">Reset Password</h1>
          <p className="text-brand-text-muted text-sm">Enter your email to receive a reset link</p>
        </div>

        {/* Card */}
        <div className="card-dark p-8 space-y-6">
          {error && (
            <Alert
              type="error"
              role="alert"
              aria-live="assertive"
              className="border-l-4 border-red-500 bg-red-500/10 shadow-lg"
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-brand-text mb-2.5">Email Address</label>
              <Input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                className="input-base"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full py-3 font-semibold text-base"
            >
              {isLoading ? 'Sending link...' : 'Send Reset Link'}
            </Button>
          </form>

          {/* Divider */}
          <div className="border-t border-brand-dark-border" />

          {/* Footer */}
          <div className="text-center space-y-3">
            <p className="text-sm text-brand-text-muted">
              Remember your password?{' '}
              <Link href="/auth/login" className="text-brand-primary hover:text-brand-primary-light font-semibold transition-colors">
                Sign in
              </Link>
            </p>
            <p className="text-sm text-brand-text-muted">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-brand-primary hover:text-brand-primary-light font-semibold transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
