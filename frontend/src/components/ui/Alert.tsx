'use client'

import clsx from 'clsx'
import { ReactNode } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type: 'success' | 'error' | 'warning' | 'info'
  children: ReactNode
}

export function Alert({ type, className, children, ...props }: AlertProps) {
  const typeClasses = {
    success: 'bg-green-50 border-l-4 border-green-500 text-green-800 shadow-sm',
    error: 'bg-red-50 border-l-4 border-red-500 text-red-800 shadow-sm',
    warning: 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 shadow-sm',
    info: 'bg-blue-50 border-l-4 border-[#2728D2] text-blue-800 shadow-sm',
  }

  const iconComponents = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    info: <Info className="w-5 h-5 text-[#2728D2]" />,
  }

  return (
    <div 
      className={clsx('rounded-lg p-4 flex items-start gap-3 transition-all duration-200 animate-in fade-in slide-in-from-top-2', typeClasses[type], className)} 
      role="alert"
      {...props}
    >
      <span className="flex-shrink-0 mt-0.5">{iconComponents[type]}</span>
      <div className="flex-1 text-sm font-medium leading-relaxed">{children}</div>
    </div>
  )
}
