/**
 * VaxTrace Nigeria - Button Component
 *
 * Reusable button component with variants
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline';
  className?: string;
  children: React.ReactNode;
}

export function Button({ 
  variant = 'default',
  className,
  children,
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50';
  
  const variantStyles = {
    default: 'bg-primary text-white hover:bg-primary/90',
    ghost: 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    outline: 'border border-slate-300 bg-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800',
  };
  
  return (
    <button
      className={cn(
        baseStyles,
        variantStyles[variant],
        'px-4 py-2 text-sm',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
