'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginSchema, LoginInput } from '@/lib/schemas'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { setAuthToken } from '@/lib/auth'
import { Input, Button, Alert } from '@/components/ui'

declare global {
  interface Window {
    google?: any
  }
}

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const googleButtonRef = useRef<HTMLDivElement | null>(null)

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
        setAuthToken(
          response.data.data.token.access_token,
          response.data.data.token.expires_in
        )
        localStorage.setItem('user', JSON.stringify(response.data.data.user))

        setSuccess('Signed in successfully. Redirecting to your dashboard...')
        setTimeout(() => router.push('/dashboard'), 700)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.error?.detail || 'Failed to sign in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleCredential = async (credential: string) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await apiClient.googleAuth(credential)
      if (response.data?.data?.token) {
        setAuthToken(
          response.data.data.token.access_token,
          response.data.data.token.expires_in
        )
        localStorage.setItem('user', JSON.stringify(response.data.data.user))
        setSuccess('Signed in with Google. Redirecting to your dashboard...')
        setTimeout(() => router.push('/dashboard'), 700)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Google sign-in failed')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      console.warn('NEXT_PUBLIC_GOOGLE_CLIENT_ID not configured')
      return
    }

    const loadGoogleScript = () => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => {
        if (window.google && googleButtonRef.current) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: any) => handleGoogleCredential(response.credential),
          })
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
          })
        }
      }
      document.body.appendChild(script)
    }

    if (!window.google) {
      loadGoogleScript()
    } else if (googleButtonRef.current) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => handleGoogleCredential(response.credential),
      })
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'continue_with',
      })
    }
  }, [])

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
              className="border-l-4 border-red-500 bg-red-500/10 shadow-lg"
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
                <Link href="/auth/forgot-password" className="text-xs text-brand-primary hover:text-brand-primary-light transition-colors">
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
          <div ref={googleButtonRef} className="w-full" />
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
