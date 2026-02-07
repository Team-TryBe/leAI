'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiClient } from '@/lib/api'
import { Input, Button, Alert } from '@/components/ui'
import Link from 'next/link'

const ResetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tokenValid, setTokenValid] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
    mode: 'onSubmit',
  })

  useEffect(() => {
    if (!token) {
      setTokenValid(false)
      setError('No reset token provided')
    }
  }, [token])

  const onSubmit = async (data: ResetPasswordInput) => {
    if (!token) return

    setIsLoading(true)
    setError(null)

    try {
      await apiClient.resetPassword(token, data.password)
      setSubmitted(true)
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.error?.detail ||
        'Failed to reset password'
      )
      setTokenValid(false)
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
            <h1 className="text-3xl font-display font-bold text-brand-text mb-2">Password Reset</h1>
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <div className="text-center space-y-3">
              <h2 className="text-xl font-semibold text-brand-text">Password reset successful</h2>
              <p className="text-sm text-brand-text-muted">
                Your password has been updated. You can now sign in with your new password.
              </p>
            </div>

            <div className="pt-4">
              <button
                onClick={() => router.push('/auth/login')}
                className="block w-full px-4 py-2 bg-brand-primary text-white rounded-lg font-semibold hover:bg-brand-primary-dark transition-colors text-center"
              >
                Go to Login
              </button>
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
          <h1 className="text-3xl font-display font-bold text-brand-text mb-2">Set New Password</h1>
          <p className="text-brand-text-muted text-sm">Create a strong password for your account</p>
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
              {!tokenValid && (
                <div className="mt-3 pt-3 border-t border-red-500/20">
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-red-400 hover:text-red-300 font-semibold transition-colors"
                  >
                    Request new reset link
                  </Link>
                </div>
              )}
            </Alert>
          )}

          {tokenValid && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-brand-text mb-2.5">New Password</label>
                <Input
                  {...register('password')}
                  type="password"
                  placeholder="Enter your new password"
                  error={errors.password?.message}
                  className="input-base"
                />
                <p className="text-xs text-brand-text-muted mt-2">
                  At least 8 characters with a mix of uppercase, lowercase, and numbers for security
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-brand-text mb-2.5">Confirm Password</label>
                <Input
                  {...register('confirmPassword')}
                  type="password"
                  placeholder="Confirm your new password"
                  error={errors.confirmPassword?.message}
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
                {isLoading ? 'Updating password...' : 'Reset Password'}
              </Button>
            </form>
          )}

          {!tokenValid && (
            <div className="pt-4">
              <Link
                href="/auth/forgot-password"
                className="block w-full px-4 py-2 bg-brand-primary text-white rounded-lg font-semibold hover:bg-brand-primary-dark transition-colors text-center"
              >
                Request New Reset Link
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
