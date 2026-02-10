<<<<<<< HEAD
import React from 'react'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
  onClick?: () => void
  disabled?: boolean
  className?: string
=======
import React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
>>>>>>> origin/main
}

export function Button({
  children,
  variant = 'primary',
<<<<<<< HEAD
  size = 'medium',
  fullWidth = false,
  onClick,
  disabled = false,
  className = '',
}: ButtonProps) {
  const baseStyles = 'font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
  }
  
  const sizeStyles = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  }
  
  const widthStyles = fullWidth ? 'w-full' : ''
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : ''
  
=======
  size = 'md',
  onClick,
  className = '',
  disabled = false,
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variants: Record<string, string> = {
    primary: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500 shadow-lg hover:shadow-xl',
    secondary: 'bg-gray-800 hover:bg-gray-900 text-white focus:ring-gray-500',
    outline: 'border-2 border-white text-white hover:bg-white hover:text-gray-900 focus:ring-white',
  };

  const sizes: Record<string, string> = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

>>>>>>> origin/main
  return (
    <button
      onClick={onClick}
      disabled={disabled}
<<<<<<< HEAD
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${disabledStyles} ${className}`}
    >
      {children}
    </button>
  )
=======
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
>>>>>>> origin/main
}
