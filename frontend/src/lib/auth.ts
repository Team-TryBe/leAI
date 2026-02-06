import Cookies from 'js-cookie'

const TOKEN_KEY = 'aditus_access_token'
const REFRESH_TOKEN_KEY = 'aditus_refresh_token'

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return Cookies.get(TOKEN_KEY) || null
}

export const setAuthToken = (token: string, expiresIn?: number) => {
  if (typeof window === 'undefined') return

  const options: Cookies.CookieAttributes = {
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
  }

  if (expiresIn) {
    options.expires = expiresIn / (60 * 60 * 24) // Convert seconds to days
  }

  Cookies.set(TOKEN_KEY, token, options)
}

export const removeAuthToken = () => {
  if (typeof window === 'undefined') return
  Cookies.remove(TOKEN_KEY)
  Cookies.remove(REFRESH_TOKEN_KEY)
  localStorage.removeItem('user')
}

export const isTokenValid = (): boolean => {
  const token = getAuthToken()
  if (!token) return false

  try {
    // Simple token validation - check if it exists and is not empty
    return token.length > 0
  } catch {
    return false
  }
}

export const getTokenExpiresIn = (): number | null => {
  // Token expiration is managed by the backend
  // Frontend just stores the token and relies on 401 responses for invalidation
  return null
}

