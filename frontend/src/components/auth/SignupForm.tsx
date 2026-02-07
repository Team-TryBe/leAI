'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SignupSchema, SignupInput } from '@/lib/schemas'
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

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const googleButtonRef = useRef<HTMLDivElement | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(SignupSchema),
    mode: 'onSubmit',
  })

  const onSubmit = async (data: SignupInput) => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await apiClient.signup({
        email: data.email,
        full_name: data.full_name,
        password: data.password,
      })

      if (response.data?.success) {
        setSuccess(true)
        setTimeout(() => router.push('/auth/login?verified_email=pending'), 1500)
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error?.detail ||
          'Failed to create account'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleCredential = async (credential: string) => {
    setIsGoogleLoading(true)
    setError(null)

    try {
      const response = await apiClient.googleAuth(credential)
      if (response.data?.data?.token) {
        setAuthToken(
          response.data.data.token.access_token,
          response.data.data.token.expires_in
        )
        localStorage.setItem('user', JSON.stringify(response.data.data.user))
        setSuccess(true)

        setTimeout(() => router.push('/dashboard'), 700)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Google sign-up failed')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) return

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
        <div className="absolute top-20 right-10 w-72 h-72 bg-brand-primary/20 rounded-full filter blur-3xl animate-float" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-brand-accent/20 rounded-full filter blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <div className="text-4xl font-display font-bold bg-gradient-brand bg-clip-text text-transparent">LeAI</div>
          </div>
          <h1 className="text-3xl font-display font-bold text-brand-text mb-2">Start Your Journey</h1>
          <p className="text-brand-text-muted text-sm">Join <span className="text-brand-primary font-semibold">tryleai</span> and revolutionize your workflow</p>
        </div>

        {/* Card */}
        <div className="card-dark p-8 space-y-6">
          {error && <Alert type="error">{error}</Alert>}
          {success && (
            <Alert type="success" className="border-brand-success bg-brand-success/10">
              🎉 Account created! Check your email to verify, then sign in...
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-brand-text mb-2.5">Full Name</label>
              <Input
                {...register('full_name')}
                type="text"
                placeholder="John Doe"
                error={errors.full_name?.message}
                className="input-base"
              />
            </div>

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
              <label className="block text-sm font-semibold text-brand-text mb-2.5">Password</label>
              <Input
                {...register('password')}
                type="password"
                placeholder="At least 8 characters"
                error={errors.password?.message}
                className="input-base"
              />
              <p className="text-xs text-brand-text-muted mt-1.5">✓ Use a mix of letters, numbers & symbols</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-brand-text mb-2.5">Confirm Password</label>
              <Input
                {...register('password_confirm')}
                type="password"
                placeholder="Confirm your password"
                error={errors.password_confirm?.message}
                className="input-base"
              />
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 p-3 bg-brand-primary/10 rounded-lg border border-brand-dark-border">
              <input type="checkbox" id="terms" className="mt-1 w-4 h-4 accent-brand-primary rounded" />
              <label htmlFor="terms" className="text-xs text-brand-text-muted">
                I agree to the <a href="#" className="text-brand-primary hover:text-brand-primary-light">Terms of Service</a> and{' '}
                <a href="#" className="text-brand-primary hover:text-brand-primary-light">Privacy Policy</a>
              </label>
            </div>

            {/* Create Account Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full py-3 font-semibold text-base"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brand-dark-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-brand-dark-card text-brand-text-muted">or sign up with</span>
            </div>
          </div>

          {/* Google Sign Up */}
          {isGoogleLoading ? (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              isLoading={true}
              className="w-full py-3 font-semibold"
            >
              Connecting...
            </Button>
          ) : (
            <div ref={googleButtonRef} className="w-full" />
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-brand-text-muted">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-brand-primary hover:text-brand-primary-light font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
