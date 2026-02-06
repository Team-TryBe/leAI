'use client'

import clsx from 'clsx'
import { ReactNode } from 'react'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type: 'success' | 'error' | 'warning' | 'info'
  children: ReactNode
}

export function Alert({ type, className, children, ...props }: AlertProps) {
  const typeClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-brand-red/20 text-brand-red',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-brand-blue/20 text-brand-blue',
  }

  const iconClasses = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }

  return (
    <div className={clsx('border rounded-lg p-4 flex gap-3', typeClasses[type], className)} {...props}>
      <span className="flex-shrink-0 font-bold text-lg">{iconClasses[type]}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}
