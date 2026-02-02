/**
 * VaxTrace Nigeria - Alert Ticker Component
 * 
 * A real-time scrolling ticker that displays critical alerts
 * across Nigeria's vaccine supply chain.
 * 
 * Features:
 * - Real-time updates via WebSocket/polling
 * - Stoplight color coding (Crimson/Cyan/Neon Mint)
 * - Smooth scrolling animation
 * - Priority-based filtering
 * - Click to view details
 * - Responsive design for mobile
 * 
 * Color Palette:
 * - CRITICAL: #FF4B2B (Crimson Pulse)
 * - HIGH: #FFB800 (Electric Amber)
 * - MEDIUM: #00F5A0 (Neon Mint)
 * - LOW: #6B7280 (Steel Grey)
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Info, Activity, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface VaxTraceAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  facilityId: string;
  facilityName: string;
  state: string;
  lga: string;
  message: string;
  createdAt: string;
  isResolved: boolean;
}

type AlertType =
  | 'stockout'
  | 'near_expiry'
  | 'temperature_excursion'
  | 'vvm_stage_3'
  | 'vvm_stage_4'
  | 'power_outage'
  | 'delivery_delay';

type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

// ============================================
// UTILS
// ============================================

/**
 * Gets the color for a severity level
 */
function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical':
      return '#FF4B2B'; // Crimson Pulse
    case 'high':
      return '#FFB800'; // Electric Amber
    case 'medium':
      return '#00F5A0'; // Neon Mint
    case 'low':
      return '#6B7280'; // Steel Grey
    default:
      return '#6B7280';
  }
}

/**
 * Gets the icon for an alert type
 */
function getAlertIcon(type: AlertType) {
  switch (type) {
    case 'stockout':
    case 'vvm_stage_4':
      return AlertTriangle;
    case 'temperature_excursion':
    case 'vvm_stage_3':
      return Activity;
    default:
      return Info;
  }
}

/**
 * Formats the alert message for display
 */
function formatAlertMessage(alert: VaxTraceAlert): string {
  const { facilityName, state, message } = alert;
  return `${state.toUpperCase()}: ${facilityName} - ${message}`;
}

// ============================================
// COMPONENT
// ============================================

interface AlertTickerProps {
  className?: string;
  maxAlerts?: number;
  scrollSpeed?: number;
  showResolved?: boolean;
  filterSeverity?: AlertSeverity[];
  onAlertClick?: (alert: VaxTraceAlert) => void;
}

export function AlertTicker({
  className,
  maxAlerts = 10,
  scrollSpeed = 30,
  showResolved = false,
  filterSeverity,
  onAlertClick,
}: AlertTickerProps) {
  const [alerts, setAlerts] = useState<VaxTraceAlert[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Fetch alerts from API
  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: async () => {
      const response = await fetch('/api/v1/alerts/active');
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }
      const json = await response.json();
      // Extract data property from API response { success, data, count }
      return json.data || [];
    },
    refetchInterval: 30000, // Poll every 30 seconds
    refetchOnWindowFocus: true,
  });

  // Update alerts when data changes
  useEffect(() => {
    if (alertsData) {
      // Ensure alertsData is an array
      const alertsArray = Array.isArray(alertsData) ? alertsData : [];
      let filtered = alertsArray;

      // Filter out resolved alerts if not showing them
      if (!showResolved) {
        filtered = filtered.filter((alert) => !alert.isResolved);
      }

      // Filter by severity if specified
      if (filterSeverity && filterSeverity.length > 0) {
        filtered = filtered.filter((alert) =>
          filterSeverity.includes(alert.severity)
        );
      }

      // Filter out dismissed alerts
      filtered = filtered.filter(
        (alert) => !dismissedAlerts.has(alert.id)
      );

      // Sort by severity and date
      filtered = filtered.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const severityDiff =
          severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;

        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      // Limit to max alerts
      filtered = filtered.slice(0, maxAlerts);

      setAlerts(filtered);
    }
  }, [alertsData, showResolved, filterSeverity, dismissedAlerts, maxAlerts]);

  // Dismiss an alert
  const dismissAlert = useCallback((alertId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
  }, []);

  // Handle alert click
  const handleAlertClick = useCallback(
    (alert: VaxTraceAlert) => {
      if (onAlertClick) {
        onAlertClick(alert);
      }
    },
    [onAlertClick]
  );

  // Pause scrolling on hover
  const handleMouseEnter = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'w-full bg-slate-900/50 backdrop-blur-sm border-y border-slate-700/50',
          'py-2 px-4',
          className
        )}
      >
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Activity className="w-4 h-4 animate-pulse" />
          <span>Loading alerts...</span>
        </div>
      </div>
    );
  }

  // Show empty state
  if (alerts.length === 0) {
    return (
      <div
        className={cn(
          'w-full bg-slate-900/50 backdrop-blur-sm border-y border-slate-700/50',
          'py-2 px-4',
          className
        )}
      >
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <Info className="w-4 h-4" />
          <span>All systems operational. No active alerts.</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full bg-slate-900/50 backdrop-blur-sm border-y border-slate-700/50',
        'py-2 px-4 overflow-hidden',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Scrolling container */}
      <div
        className={cn(
          'flex gap-6 whitespace-nowrap',
          'transition-transform duration-1000 ease-linear',
          isPaused && 'pause'
        )}
        style={{
          animation: `scroll ${scrollSpeed}s linear infinite`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      >
        {alerts.map((alert) => {
          const Icon = getAlertIcon(alert.type);
          const color = getSeverityColor(alert.severity);

          return (
            <div
              key={alert.id}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
                'bg-slate-800/50 border border-slate-700/50',
                'hover:bg-slate-700/50 transition-colors cursor-pointer',
                'group'
              )}
              style={{
                borderColor: `${color}30`,
              }}
              onClick={() => handleAlertClick(alert)}
            >
              {/* Icon */}
              <Icon
                className="w-4 h-4 flex-shrink-0"
                style={{ color }}
              />

              {/* Message */}
              <span className="text-sm text-slate-200">
                {formatAlertMessage(alert)}
              </span>

              {/* Dismiss button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissAlert(alert.id);
                }}
                className={cn(
                  'opacity-0 group-hover:opacity-100',
                  'transition-opacity',
                  'hover:text-white text-slate-400'
                )}
              >
                <X className="w-3 h-3" />
              </button>

              {/* Glow effect for critical alerts */}
              {alert.severity === 'critical' && (
                <div
                  className="absolute inset-0 rounded-full animate-pulse"
                  style={{
                    backgroundColor: `${color}20`,
                    boxShadow: `0 0 20px ${color}40`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* CSS animation for scrolling */}
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================
// ALERT DETAILS MODAL
// ============================================

interface AlertDetailsModalProps {
  alert: VaxTraceAlert | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AlertDetailsModal({
  alert,
  isOpen,
  onClose,
}: AlertDetailsModalProps) {
  if (!isOpen || !alert) return null;

  const color = getSeverityColor(alert.severity);
  const Icon = getAlertIcon(alert.type);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-black/50 backdrop-blur-sm',
        'animate-in fade-in duration-200'
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          'bg-slate-900 border border-slate-700 rounded-lg',
          'max-w-md w-full mx-4',
          'shadow-2xl',
          'animate-in zoom-in duration-200'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-3 px-6 py-4',
            'border-b border-slate-700'
          )}
          style={{ borderBottomColor: `${color}50` }}
        >
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">
              {alert.type.replace(/_/g, ' ').toUpperCase()}
            </h3>
            <p className="text-sm text-slate-400">
              {alert.severity.toUpperCase()} PRIORITY
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Message */}
          <div>
            <p className="text-slate-200">{alert.message}</p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Facility:</span>
              <span className="text-slate-200">{alert.facilityName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">LGA:</span>
              <span className="text-slate-200">{alert.lga}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">State:</span>
              <span className="text-slate-200">{alert.state}</span>
            </div>
          </div>

          {/* Timestamp */}
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Reported:</span>
            <span className="text-slate-200">
              {new Date(alert.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-700 flex gap-3">
          <button
            className={cn(
              'flex-1 px-4 py-2 rounded-lg',
              'bg-slate-800 text-slate-200',
              'hover:bg-slate-700 transition-colors'
            )}
            onClick={onClose}
          >
            Dismiss
          </button>
          <button
            className={cn(
              'flex-1 px-4 py-2 rounded-lg',
              'text-white font-medium',
              'hover:opacity-90 transition-opacity'
            )}
            style={{ backgroundColor: color }}
            onClick={() => {
              // Navigate to facility details
              window.location.href = `/dashboard/facilities/${alert.facilityId}`;
            }}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ALERT COUNT BADGE
// ============================================

interface AlertCountBadgeProps {
  className?: string;
  filterSeverity?: AlertSeverity[];
}

export function AlertCountBadge({
  className,
  filterSeverity,
}: AlertCountBadgeProps) {
  const { data: alertsData } = useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: async () => {
      const response = await fetch('/api/v1/alerts/active');
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }
      return response.json() as Promise<VaxTraceAlert[]>;
    },
    refetchInterval: 30000,
  });

  const count = alertsData
    ? alertsData.filter((alert) => {
        if (filterSeverity && filterSeverity.length > 0) {
          return filterSeverity.includes(alert.severity);
        }
        return !alert.isResolved;
      }).length
    : 0;

  if (count === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center',
        'w-5 h-5 text-xs font-bold text-white rounded-full',
        'animate-bounce',
        className
      )}
      style={{
        backgroundColor:
          count > 10
            ? '#FF4B2B' // Critical
            : count > 5
            ? '#FFB800' // High
            : '#00F5A0', // Medium
      }}
    >
      {count > 99 ? '99+' : count}
    </div>
  );
}
