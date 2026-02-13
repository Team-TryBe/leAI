'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
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
      const errorMsg = err.response?.data?.detail || err.response?.data?.error?.detail || 'Failed to sign in'
      // Provide more user-friendly error messages
      if (errorMsg.toLowerCase().includes('credentials') || errorMsg.toLowerCase().includes('invalid')) {
        setError('Invalid email or password. Please check your credentials and try again.')
      } else if (errorMsg.toLowerCase().includes('not found') || errorMsg.toLowerCase().includes('does not exist')) {
        setError('No account found with this email. Please check your email or sign up.')
      } else if (errorMsg.toLowerCase().includes('verify') || errorMsg.toLowerCase().includes('verification')) {
        setError('Please verify your email address before signing in. Check your inbox for the verification link.')
      } else if (errorMsg.toLowerCase().includes('disabled') || errorMsg.toLowerCase().includes('suspended')) {
        setError('Your account has been disabled. Please contact support for assistance.')
      } else {
        setError(errorMsg)
      }
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
      const errorMsg = err.response?.data?.detail || 'Google sign-in failed'
      if (errorMsg.toLowerCase().includes('popup') || errorMsg.toLowerCase().includes('closed')) {
        setError('Google sign-in was cancelled. Please try again.')
      } else {
        setError('Unable to sign in with Google. Please try email/password or contact support.')
      }
    } finally {
      setIsLoading(false)
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
          <h1 className="text-3xl font-display font-bold text-black mb-2">Welcome Back</h1>
          <p className="text-black text-sm">Sign in to continue to <span className="text-black font-semibold">LeAI</span></p>
        </div>

        {/* Card */}
        <div className="bg-white p-8 space-y-6 border border-gray-300 rounded-lg">
          {error && (
            <Alert
              type="error"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </Alert>
          )}
          {success && (
            <Alert
              type="success"
              role="status"
              aria-live="polite"
            >
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
              <div className="flex items-center justify-between mb-2.5">
                <label className="block text-sm font-semibold text-black">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-black hover:text-gray-700 transition-colors">
                  Forgot?
                </Link>
              </div>
              <Input
                {...register('password')}
                type="password"
                placeholder="Enter your password"
                error={errors.password?.message}
                className="input-base text-black"
              />
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 font-semibold text-base bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-black">or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <div ref={googleButtonRef} className="w-full" />
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-black">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-black hover:text-gray-700 font-semibold transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
