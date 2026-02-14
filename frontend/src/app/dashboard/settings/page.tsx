'use client';

import { useState } from 'react';
import { useVaxTraceStore, useTheme } from '@/store/useVaxTraceStore';
import { 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  Monitor, 
  Bell, 
  BellOff,
  Shield,
  User,
  Database,
  Palette,
  Save,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { userSession } = useVaxTraceStore();
  const { theme, setTheme, getEffectiveTheme } = useTheme();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  // Settings state
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    alerts: true,
    weekly: false,
  });
  
  const [privacy, setPrivacy] = useState({
    shareData: false,
    analytics: true,
  });
  
  const [data, setData] = useState({
    autoSync: true,
    syncInterval: '5',
    cacheEnabled: true,
  });

  const handleSave = () => {
    setSaveStatus('saving');
    // Simulate save
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const themeOptions = [
    {
      value: 'light' as const,
      label: 'Light',
      icon: Sun,
      description: 'Clean and bright interface',
    },
    {
      value: 'dark' as const,
      label: 'Dark',
      icon: Moon,
      description: 'Easy on the eyes',
    },
    {
      value: 'system' as const,
      label: 'System',
      icon: Monitor,
      description: 'Follows your device setting',
    },
  ];

  const settingsSections = [
    {
      id: 'appearance',
      title: 'Appearance',
      icon: Palette,
      description: 'Customize how VaxTrace looks',
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: Bell,
      description: 'Manage your alert preferences',
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: Shield,
      description: 'Control your data and security',
    },
    {
      id: 'data',
      title: 'Data & Sync',
      icon: Database,
      description: 'Manage data storage and synchronization',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-16 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 dark:from-emerald-500/20 dark:to-cyan-500/20">
              <SettingsIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manage your VaxTrace preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Appearance Section */}
        <section id="appearance" className="space-y-6">
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Appearance</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Customize how VaxTrace looks</p>
            </div>
          </div>

          <div className="bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">Theme</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.value;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all',
                      'hover:bg-slate-200 dark:hover:bg-slate-800/50',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/10'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/30'
                    )}
                  >
                    <div className={cn(
                      'p-3 rounded-lg',
                      isSelected ? 'bg-emerald-500/20' : 'bg-slate-200 dark:bg-slate-700/50'
                    )}>
                      <Icon className={cn(
                        'w-6 h-6',
                        isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                      )} />
                    </div>
                    <div className="text-center">
                      <p className={cn(
                        'font-medium',
                        isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                      )}>
                        {option.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        {option.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section id="notifications" className="space-y-6">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Notifications</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Manage your alert preferences</p>
            </div>
          </div>

          <div className="bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            {[
              { key: 'email', label: 'Email Notifications', description: 'Receive alerts via email' },
              { key: 'push', label: 'Push Notifications', description: 'Get browser notifications' },
              { key: 'alerts', label: 'In-App Alerts', description: 'Show alerts in the dashboard' },
              { key: 'weekly', label: 'Weekly Summary', description: 'Receive weekly stock reports' },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-800 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{item.label}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{item.description}</p>
                </div>
                <button
                  onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                  className={cn(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
                    notifications[item.key as keyof typeof notifications] ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      notifications[item.key as keyof typeof notifications] ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy Section */}
        <section id="privacy" className="space-y-6">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Privacy & Security</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Control your data and security</p>
            </div>
          </div>

          <div className="bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            {[
              { key: 'shareData', label: 'Share Anonymous Data', description: 'Help improve VaxTrace with anonymous usage data' },
              { key: 'analytics', label: 'Analytics', description: 'Allow tracking for product improvements' },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-800 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{item.label}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{item.description}</p>
                </div>
                <button
                  onClick={() => setPrivacy(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                  className={cn(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
                    privacy[item.key as keyof typeof privacy] ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      privacy[item.key as keyof typeof privacy] ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Data & Sync Section */}
        <section id="data" className="space-y-6">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Data & Sync</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Manage data storage and synchronization</p>
            </div>
          </div>

          <div className="bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Auto Sync</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Automatically sync data with server</p>
                </div>
                <button
                  onClick={() => setData(prev => ({ ...prev, autoSync: !prev.autoSync }))}
                  className={cn(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
                    data.autoSync ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      data.autoSync ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              <div>
                <label htmlFor="syncInterval" className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                  Sync Interval (minutes)
                </label>
                <select
                  id="syncInterval"
                  value={data.syncInterval}
                  onChange={(e) => setData(prev => ({ ...prev, syncInterval: e.target.value }))}
                  disabled={!data.autoSync}
                  className={cn(
                    'w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700',
                    'text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <option value="1">1 minute</option>
                  <option value="5">5 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Cache Enabled</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Store data locally for offline access</p>
                </div>
                <button
                  onClick={() => setData(prev => ({ ...prev, cacheEnabled: !prev.cacheEnabled }))}
                  className={cn(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
                    data.cacheEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      data.cacheEnabled ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Account Info */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Account</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Your account information</p>
            </div>
          </div>

          <div className="bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {userSession?.user?.name || 'User'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {userSession?.user?.email || 'user@example.com'}
                </p>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    {userSession?.user?.role?.replace(/_/g, ' ') || 'Guest'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-lg font-medium',
              'bg-gradient-to-r from-emerald-500 to-cyan-500',
              'text-white hover:from-emerald-600 hover:to-cyan-600',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {saveStatus === 'saving' ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
