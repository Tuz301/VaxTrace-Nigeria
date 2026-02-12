import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date to a localized string
 */
export function formatDate(date: string | Date, locale = 'en-NG'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date and time to a localized string
 */
export function formatDateTime(date: string | Date, locale = 'en-NG'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate the distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Format a number with thousands separator
 */
export function formatNumber(num: number, locale = 'en-NG'): string {
  return num.toLocaleString(locale);
}

/**
 * Format a percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get the color class for a stock status
 */
export function getStockStatusColor(status: string): string {
  const colors: Record<string, string> = {
    CRITICAL: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
    LOW: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    ADEQUATE: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    OVERSTOCKED: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30',
  };
  return colors[status] || 'text-slate-500 bg-slate-500/10 border-slate-500/30';
}

/**
 * Get the color class for an alert severity
 */
export function getAlertSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    CRITICAL: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
    HIGH: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
    MEDIUM: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    LOW: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
  };
  return colors[severity] || 'text-slate-500 bg-slate-500/10 border-slate-500/30';
}

/**
 * Get the color class for a VVM stage
 */
export function getVVMStageColor(stage: number): string {
  const colors: Record<number, string> = {
    1: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    2: 'text-lime-500 bg-lime-500/10 border-lime-500/30',
    3: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    4: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
  };
  return colors[stage] || 'text-slate-500 bg-slate-500/10 border-slate-500/30';
}

/**
 * Calculate days until expiration
 */
export function daysUntilExpiration(expiryDate: string | Date): number {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const today = new Date();
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get expiry risk level
 */
export function getExpiryRisk(expiryDate: string | Date): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  const days = daysUntilExpiration(expiryDate);
  if (days < 30) return 'CRITICAL';
  if (days < 60) return 'HIGH';
  if (days < 90) return 'MEDIUM';
  return 'LOW';
}

/**
 * Get expiry risk color class
 */
export function getExpiryRiskColor(expiryDate: string | Date): string {
  const risk = getExpiryRisk(expiryDate);
  switch (risk) {
    case 'CRITICAL': return 'text-rose-400';
    case 'HIGH': return 'text-amber-400';
    case 'MEDIUM': return 'text-yellow-400';
    case 'LOW': return 'text-emerald-400';
    default: return 'text-slate-400';
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sleep function for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if the code is running on the client side
 */
export function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if the code is running on the server side
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}

/**
 * Get the user's timezone
 */
export function getUserTimezone(): string {
  if (isClient()) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return 'Africa/Lagos';
}

/**
 * Format a file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert a string to title case
 */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: any): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Get the base URL for API requests
 */
export function getApiBaseUrl(): string {
  if (isClient()) {
    // In production, use the same origin
    if (window.location.hostname !== 'localhost') {
      return window.location.origin;
    }
  }
  // In development, use the API_URL from env or default to localhost:8000 (backend)
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

/**
 * Check if the app is in offline mode
 */
export function isOfflineMode(): boolean {
  if (isClient()) {
    return !navigator.onLine;
  }
  return false;
}

/**
 * Download data as a file
 */
export function downloadAsFile(data: any, filename: string, type = 'application/json') {
  if (!isClient()) return;

  const blob = new Blob([JSON.stringify(data, null, 2)], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!isClient()) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Nigerian state codes mapping
 */
export const NIGERIA_STATES: Record<string, { code: string; zone: string }> = {
  'Federal Capital Territory': { code: 'FC', zone: 'North Central' },
  Abia: { code: 'AB', zone: 'South East' },
  Adamawa: { code: 'AD', zone: 'North East' },
  AkwaIbom: { code: 'AK', zone: 'South South' },
  Anambra: { code: 'AN', zone: 'South East' },
  Bauchi: { code: 'BA', zone: 'North East' },
  Bayelsa: { code: 'BY', zone: 'South South' },
  Benue: { code: 'BN', zone: 'North Central' },
  Borno: { code: 'BO', zone: 'North East' },
  CrossRiver: { code: 'CR', zone: 'South South' },
  Delta: { code: 'DT', zone: 'South South' },
  Ebonyi: { code: 'EB', zone: 'South East' },
  Edo: { code: 'ED', zone: 'South South' },
  Ekiti: { code: 'EK', zone: 'South West' },
  Enugu: { code: 'EN', zone: 'South East' },
  Gombe: { code: 'GM', zone: 'North East' },
  Imo: { code: 'IM', zone: 'South East' },
  Jigawa: { code: 'JG', zone: 'North West' },
  Kaduna: { code: 'KD', zone: 'North West' },
  Kano: { code: 'KN', zone: 'North West' },
  Katsina: { code: 'KT', zone: 'North West' },
  Kebbi: { code: 'KE', zone: 'North West' },
  Kogi: { code: 'KG', zone: 'North Central' },
  Kwara: { code: 'KW', zone: 'North Central' },
  Lagos: { code: 'LA', zone: 'South West' },
  Nasarawa: { code: 'NS', zone: 'North Central' },
  Niger: { code: 'NG', zone: 'North Central' },
  Ogun: { code: 'OG', zone: 'South West' },
  Ondo: { code: 'OD', zone: 'South West' },
  Osun: { code: 'OS', zone: 'South West' },
  Oyo: { code: 'OY', zone: 'South West' },
  Plateau: { code: 'PL', zone: 'North Central' },
  Rivers: { code: 'RV', zone: 'South South' },
  Sokoto: { code: 'SK', zone: 'North West' },
  Taraba: { code: 'TR', zone: 'North East' },
  Yobe: { code: 'YO', zone: 'North East' },
  Zamfara: { code: 'ZM', zone: 'North West' },
};
