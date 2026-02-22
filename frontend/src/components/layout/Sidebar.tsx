'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Truck,
  Thermometer,
  BarChart3,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { useVaxTraceStore } from '@/store/useVaxTraceStore';
import { cn } from '@/lib/utils';

// Navigation configuration
const NAV_ITEMS = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Dashboard overview and analytics',
  },
  {
    label: 'Inventory',
    href: '/dashboard/inventory',
    icon: Package,
    description: 'Vaccine stock management',
  },
  {
    label: 'Last-Mile Delivery',
    href: '/dashboard/delivery',
    icon: Truck,
    description: 'Track vaccine deliveries',
  },
  {
    label: 'Cold Chain',
    href: '/dashboard/cold-chain',
    icon: Thermometer,
    description: 'Temperature monitoring',
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
    description: 'Data insights and reports',
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'Manage your preferences',
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useVaxTraceStore();

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
          role="presentation"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-64 flex flex-col',
          'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r border-slate-200 dark:border-slate-800',
          'transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
        role="navigation"
        aria-label="Main navigation"
        aria-hidden={!sidebarOpen}
        inert={!sidebarOpen}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 group"
            aria-label="VaxTrace Nigeria - Return to dashboard"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">VT</span>
              </div>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                VaxTrace
              </h1>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider">Nigeria</p>
            </div>
          </Link>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            aria-label="Close navigation menu"
            aria-controls="sidebar-navigation"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav
          className="flex-1 overflow-y-auto py-4 px-3"
          aria-label="Primary navigation"
          id="sidebar-navigation"
        >
          <ul className="space-y-1" role="list">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      // Close sidebar on mobile after navigation
                      if (window.innerWidth < 1024) {
                        toggleSidebar();
                      }
                    }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                      'transition-all duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
                      isActive
                        ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    )}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    aria-describedby={`nav-${item.href.replace(/\//g, '-')}-desc`}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5 flex-shrink-0 transition-colors',
                      )}
                      aria-hidden="true"
                    />
                    <span className="font-medium">{item.label}</span>
                    <span id={`nav-${item.href.replace(/\//g, '-')}-desc`} className="sr-only">
                      {item.description}
                    </span>
                   
                    {/* Active indicator */}
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Divider */}
          <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />

          {/* Status Section */}
          <div className="px-3 py-2">
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">System Online</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-500">
                OpenLMIS API Connected
              </p>
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-[10px] text-slate-500 dark:text-slate-500 text-center">
            © 2024 VaxTrace Nigeria
          </p>
        </div>
      </aside>
    </>
  );
}

// Mobile Hamburger Button Component
export function MobileMenuButton() {
  const { sidebarOpen, toggleSidebar } = useVaxTraceStore();

  return (
    <button
      onClick={toggleSidebar}
      className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      aria-label="Open navigation menu"
      aria-expanded={sidebarOpen}
    >
      {sidebarOpen ? (
        <X className="w-6 h-6" />
      ) : (
        <Menu className="w-6 h-6" />
      )}
    </button>
  );
}
