'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Search, Settings, User, ChevronDown } from 'lucide-react';
import { useVaxTraceStore } from '@/store/useVaxTraceStore';
import { cn } from '@/lib/utils';
import { MobileMenuButton } from './Sidebar';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const pathname = usePathname();
  const { userSession, alerts } = useVaxTraceStore();

  // Get page title based on current path
  const getPageTitle = () => {
    if (pathname === '/dashboard' || pathname === '/') return 'Overview';
    if (pathname.includes('inventory')) return 'Inventory';
    if (pathname.includes('delivery')) return 'Last-Mile Delivery';
    if (pathname.includes('cold-chain')) return 'Cold Chain';
    if (pathname.includes('analytics')) return 'Analytics';
    if (pathname.includes('settings')) return 'Settings';
    return 'Dashboard';
  };

  // Count critical and high priority alerts
  const alertCount = alerts.filter(
    (a) => !a.isResolved && ['CRITICAL', 'HIGH'].includes(a.severity)
  ).length;

  return (
    <header
      className={cn(
        'sticky top-0 z-30 w-full',
        'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800',
        'h-16 flex items-center justify-between px-4 lg:px-6',
        className
      )}
    >
      {/* Left Section: Mobile Menu + Page Title */}
      <div className="flex items-center gap-4">
        <MobileMenuButton />
        
        {/* Page Title - Hidden on mobile, shown on desktop */}
        <div className="hidden lg:block">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {getPageTitle()}
          </h2>
        </div>
      </div>

      {/* Center Section: Search Bar (Desktop only) */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search facilities, vaccines, alerts..."
            className={cn(
              'w-full h-10 pl-10 pr-4 py-2',
              'bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg',
              'text-sm text-slate-900 dark:text-slate-200 placeholder:text-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
              'transition-all duration-200'
            )}
            aria-label="Search"
          />
        </div>
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Alert Notifications */}
        <button
          className={cn(
            'relative p-2 rounded-lg',
            'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500',
            'transition-all duration-200'
          )}
          aria-label={`Notifications${alertCount > 0 ? ` (${alertCount} unread)` : ''}`}
        >
          <Bell className="w-5 h-5" />
          {alertCount > 0 && (
            <span
              className={cn(
                'absolute top-1 right-1 w-2.5 h-2.5 rounded-full',
                'bg-rose-500 border-2 border-white dark:border-slate-900',
                'animate-pulse'
              )}
              aria-hidden="true"
            />
          )}
        </button>

        {/* Settings */}
        <Link
          href="/dashboard/settings"
          className={cn(
            'hidden sm:flex p-2 rounded-lg',
            'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500',
            'transition-all duration-200'
          )}
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </Link>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <button
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg',
              'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500',
              'transition-all duration-200'
            )}
            aria-label="User menu"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {userSession?.user?.name || 'User'}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                {userSession?.user?.role?.replace(/_/g, ' ') || 'Guest'}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 hidden lg:block text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
}
