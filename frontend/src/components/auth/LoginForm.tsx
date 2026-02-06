'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginSchema, LoginInput } from '@/lib/schemas'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { setAuthToken } from '@/lib/auth'
import { Input, Button, Alert } from '@/components/ui'

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    mode: 'onSubmit',
  })

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await apiClient.login({
        email: data.email,
        password: data.password,
      })

      if (response.data?.data?.token) {
        // Set auth token first
        setAuthToken(
          response.data.data.token.access_token,
          response.data.data.token.expires_in
        )
        localStorage.setItem('user', JSON.stringify(response.data.data.user))

        setSuccess('Signed in successfully. Redirecting to your dashboard...')
        setTimeout(() => router.push('/dashboard'), 700)
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.detail || 'Failed to sign in')
    } finally {
      setIsLoading(false)
    }
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
          <h1 className="text-3xl font-display font-bold text-brand-text mb-2">Welcome Back</h1>
          <p className="text-brand-text-muted text-sm">Sign in to continue to <span className="text-brand-primary font-semibold">tryleai</span></p>
        </div>

        {/* Card */}
        <div className="card-dark p-8 space-y-6">
          {error && (
            <Alert
              type="error"
              role="alert"
              aria-live="assertive"
              className="border-l-4 border-brand-red bg-brand-red/10 shadow-lg"
            >
              {error}
            </Alert>
          )}
          {success && (
            <Alert
              type="success"
              role="status"
              aria-live="polite"
              className="border-l-4 border-brand-success bg-brand-success/10 shadow-lg"
            >
              {success}
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

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="block text-sm font-semibold text-brand-text">Password</label>
                <Link href="#" className="text-xs text-brand-primary hover:text-brand-primary-light transition-colors">
                  Forgot?
                </Link>
              </div>
              <Input
                {...register('password')}
                type="password"
                placeholder="Enter your password"
                error={errors.password?.message}
                className="input-base"
              />
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full py-3 font-semibold text-base"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brand-dark-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-brand-dark-card text-brand-text-muted">or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full py-3 font-semibold flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-brand-text-muted">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-brand-primary hover:text-brand-primary-light font-semibold transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
