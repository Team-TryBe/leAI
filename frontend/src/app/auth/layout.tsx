import { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-grey-light to-white">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
