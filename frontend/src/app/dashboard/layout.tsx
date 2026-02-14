'use client';

import { Sidebar, Header } from '@/components/layout';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Add keyboard navigation support
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
        searchInput?.focus();
      }

      // Escape to close sidebar on mobile
      if (e.key === 'Escape') {
        const sidebar = document.querySelector('[aria-label="Main navigation"]') as HTMLElement;
        if (sidebar && window.innerWidth < 1024) {
          // Trigger sidebar close via Zustand store
          const event = new CustomEvent('close-sidebar');
          window.dispatchEvent(event);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Handle sidebar close event
    const handleCloseSidebar = () => {
      // This will be handled by the Sidebar component's Zustand store
    };

    window.addEventListener('close-sidebar', handleCloseSidebar);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('close-sidebar', handleCloseSidebar);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main
          className="flex-1 overflow-y-auto"
          id="main-content"
          tabIndex={-1}
          aria-label="Main content"
        >
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
