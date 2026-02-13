'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
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
      const errorMsg = err.response?.data?.detail || err.response?.data?.error?.detail || 'Failed to create account'
      // Provide more user-friendly error messages
      if (errorMsg.toLowerCase().includes('already exists') || errorMsg.toLowerCase().includes('already registered')) {
        setError('This email is already registered. Please sign in or use a different email.')
      } else if (errorMsg.toLowerCase().includes('invalid email')) {
        setError('Please enter a valid email address.')
      } else if (errorMsg.toLowerCase().includes('password')) {
        setError('Password must be at least 8 characters with letters, numbers, and symbols.')
      } else if (errorMsg.toLowerCase().includes('network') || errorMsg.toLowerCase().includes('connection')) {
        setError('Network error. Please check your internet connection and try again.')
      } else {
        setError(errorMsg)
      }
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
      const errorMsg = err.response?.data?.detail || 'Google sign-up failed'
      if (errorMsg.toLowerCase().includes('already exists')) {
        setError('This Google account is already registered. Please sign in instead.')
      } else if (errorMsg.toLowerCase().includes('popup') || errorMsg.toLowerCase().includes('closed')) {
        setError('Google sign-up was cancelled. Please try again.')
      } else {
        setError('Unable to sign up with Google. Please try email/password or contact support.')
      }
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
    <div className="fixed inset-0 bg-white flex items-center justify-center px-4 py-12 overflow-y-auto">
      {/* White background covers entire page */}
      <div className="w-full max-w-md my-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <Image
              src="/logos/black_logo_full.png"
              alt="LeAI Logo"
              width={120}
              height={40}
              priority
              className="h-auto"
            />
          </div>
          <h1 className="text-3xl font-display font-bold text-black mb-2">Start Your Journey</h1>
          <p className="text-black text-sm">Join <span className="text-black font-semibold">LeAI</span> and revolutionize your workflow</p>
        </div>

        {/* Card */}
        <div className="bg-white p-8 space-y-6 border border-gray-300 rounded-lg">
          {error && (
            <Alert type="error" role="alert" aria-live="assertive">
              {error}
            </Alert>
          )}
          {success && (
            <Alert type="success" role="status" aria-live="polite">
              🎉 Account created successfully! Please check your email to verify your account before signing in.
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2.5">Full Name</label>
              <Input
                {...register('full_name')}
                type="text"
                placeholder="John Doe"
                error={errors.full_name?.message}
                className="input-base text-black"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2.5">Email Address</label>
              <Input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                className="input-base text-black"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2.5">Password</label>
              <Input
                {...register('password')}
                type="password"
                placeholder="At least 8 characters"
                error={errors.password?.message}
                className="input-base text-black"
              />
              <p className="text-xs text-black mt-1.5">✓ Use a mix of letters, numbers & symbols</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2.5">Confirm Password</label>
              <Input
                {...register('password_confirm')}
                type="password"
                placeholder="Confirm your password"
                error={errors.password_confirm?.message}
                className="input-base text-black"
              />
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 p-3 bg-gray-100 rounded-lg border border-gray-300">
              <input type="checkbox" id="terms" className="mt-1 w-4 h-4 accent-black rounded" />
              <label htmlFor="terms" className="text-xs text-black">
                I agree to the <a href="#" className="text-black hover:text-gray-700">Terms of Service</a> and{' '}
                <a href="#" className="text-black hover:text-gray-700">Privacy Policy</a>
              </label>
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 font-semibold text-base bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-black">or sign up with</span>
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
          <p className="text-sm text-black">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-black hover:text-gray-700 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
