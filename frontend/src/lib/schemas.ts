import { z } from 'zod'

// Auth schemas
export const SignupSchema = z
  .object({
    email: z.string().email('Invalid email address').toLowerCase(),
    full_name: z.string().min(2, 'Full name must be at least 2 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirm: z.string(),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Passwords don't match",
    path: ['password_confirm'],
  })

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
})

export const UpdateProfileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  professional_summary: z.string().max(500).optional(),
})

// Type exports
export type SignupInput = z.infer<typeof SignupSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>

// API Response types
export interface AuthToken {
  access_token: string
  token_type: string
  expires_in: number
}

export interface User {
  id: number
  email: string
  full_name: string
  phone?: string
  location?: string
  professional_summary?: string
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  success: boolean
  data?: {
    user: User
    token: AuthToken
  }
  error?: {
    detail: string
    error_code?: string
  }
}
