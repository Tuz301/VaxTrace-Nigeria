/**
 * VaxTrace Nigeria - Empty State Components
 *
 * Reusable empty state components for better UX
 * Provides clear guidance when no data is available
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Empty State Component
 * Displays when there's no data to show
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-6 py-12 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>
      
      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">
        {description}
      </p>
      
      {action && (
        <Button
          onClick={action.onClick}
          className="mb-3"
        >
          {action.label}
        </Button>
      )}
      
      {secondaryAction && (
        <Button
          onClick={secondaryAction.onClick}
          variant="ghost"
          className="text-sm"
        >
          {secondaryAction.label}
        </Button>
      )}
    </div>
  );
}

/**
 * Loading State Component
 * Displays while data is being fetched
 */
interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading data...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-6">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-300 border-t-slate-900 mb-4" />
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {message}
      </p>
    </div>
  );
}

/**
 * Error State Component
 * Displays when data fetch fails
 */
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = 'Something went wrong',
  message,
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-6 py-12 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/20">
        <svg className="h-8 w-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 9 18 0 0-18s-9-9-18-18a9 9 0 01-18 9 0 0 018z" />
        </svg>
      </div>
      
      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">
        {message}
      </p>
      
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
        >
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * Onboarding Step Component
 * Displays a step in the onboarding flow
 */
interface OnboardingStepProps {
  icon: LucideIcon;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
  stepNumber: number;
}

export function OnboardingStep({
  icon: Icon,
  title,
  description,
  isCompleted,
  isActive,
  stepNumber,
}: OnboardingStepProps) {
  return (
    <div className={`
      flex items-start gap-4 p-4 rounded-lg border-2 transition-all
      ${isActive ? 'border-primary bg-primary/5' : 
        isCompleted ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' : 
        'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}
    `}>
      <div className={`
        flex h-8 w-8 items-center justify-center rounded-full border-2
        ${isActive ? 'border-primary bg-primary text-white' : 
          isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : 
          'border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 text-slate-500'}
      `}>
        {isCompleted ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="text-sm font-semibold">{stepNumber}</span>
        )}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : isCompleted ? 'text-emerald-500' : 'text-slate-400'}`} />
          <h4 className={`font-semibold ${isActive ? 'text-primary' : 'text-slate-900 dark:text-slate-100'}`}>
            {title}
          </h4>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}
