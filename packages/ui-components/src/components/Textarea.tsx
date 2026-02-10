import React from 'react'

interface TextareaProps {
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  rows?: number
  disabled?: boolean
  required?: boolean
  className?: string
}

export function Textarea({
  placeholder,
  value,
  onChange,
  rows = 4,
  disabled = false,
  required = false,
  className = '',
}: TextareaProps) {
  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      disabled={disabled}
      required={required}
      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${className}`}
    />
  )
}
