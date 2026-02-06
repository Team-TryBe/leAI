'use client'

import clsx from 'clsx'
import { ReactNode, forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-brand-black mb-2">{label}</label>}
        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 transform -translate-y-1/2">{icon}</div>}
          <input
            ref={ref}
            className={clsx(
              'w-full px-4 py-2 rounded-lg border border-brand-grey-dark/20 text-brand-black placeholder-brand-grey-muted',
              'focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent',
              'transition-colors duration-200',
              icon && 'pl-10',
              error && 'border-brand-red focus:ring-brand-red',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-brand-red text-sm mt-1">{error}</p>}
        {helperText && !error && <p className="text-brand-grey-muted text-sm mt-1">{helperText}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Array<{ value: string; label: string }>
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-brand-black mb-2">{label}</label>}
        <select
          ref={ref}
          className={clsx(
            'w-full px-4 py-2 rounded-lg border border-brand-grey-dark/20 text-brand-black',
            'focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent',
            'transition-colors duration-200',
            error && 'border-brand-red focus:ring-brand-red',
            className
          )}
          {...props}
        >
          <option value="">Select an option</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-brand-red text-sm mt-1">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-brand-black mb-2">{label}</label>}
        <textarea
          ref={ref}
          className={clsx(
            'w-full px-4 py-2 rounded-lg border border-brand-grey-dark/20 text-brand-black placeholder-brand-grey-muted',
            'focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent',
            'transition-colors duration-200',
            error && 'border-brand-red focus:ring-brand-red',
            className
          )}
          {...props}
        />
        {error && <p className="text-brand-red text-sm mt-1">{error}</p>}
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'
