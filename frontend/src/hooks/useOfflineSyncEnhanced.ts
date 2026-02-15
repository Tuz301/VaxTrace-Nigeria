/**
 * VaxTrace Nigeria - Enhanced Offline Sync Hook for 3G/4G Networks
 *
 * Optimized for low-bandwidth networks with:
 * - Batch sync operations to reduce round trips
 * - Intelligent retry with exponential backoff
 * - Delta sync support
 * - Network-aware sync scheduling
 * - Request queuing for offline periods
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { indexedDB, createLMDRecord, LMDRecord, OfflineStats, setupNetworkListeners } from '@/lib/indexeddb';
import { optimizedFetch, getNetworkQuality, requestQueue } from '@/lib/api-optimizations';

// Extend ServiceWorkerRegistration for background sync
interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync: {
    register(tag: string): Promise<void>;
  };
}

export interface UseOfflineSyncEnhancedReturn {
  stats: OfflineStats | null;
  isOnline: boolean;
  networkQuality: ReturnType<typeof getNetworkQuality>;
  addRecord: (record: Partial<LMDRecord>) => Promise<void>;
  getRecords: () => Promise<LMDRecord[]>;
  getUnsyncedRecords: () => Promise<LMDRecord[]>;
  syncNow: () => Promise<void>;
  syncBatch: (batchSize?: number) => Promise<void>;
  clearAll: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  syncProgress: {
    total: number;
    synced: number;
    failed: number;
  };
}

// Sync configuration for different network types
const SYNC_CONFIG = {
  'slow-2g': {
    batchSize: 3,
    delayBetweenBatches: 5000,
    maxRetries: 5,
    timeout: 30000,
  },
  '2g': {
    batchSize: 5,
    delayBetweenBatches: 3000,
    maxRetries: 4,
    timeout: 25000,
  },
  '3g': {
    batchSize: 10,
    delayBetweenBatches: 2000,
    maxRetries: 3,
    timeout: 20000,
  },
  '4g': {
    batchSize: 20,
    delayBetweenBatches: 1000,
    maxRetries: 2,
    timeout: 15000,
  },
};

export function useOfflineSyncEnhanced(): UseOfflineSyncEnhancedReturn {
  const [stats, setStats] = useState<OfflineStats | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState({
    total: 0,
    synced: 0,
    failed: 0,
  });
  const swRef = useRef<ServiceWorkerRegistrationWithSync | null>(null);
  const syncInProgress = useRef(false);
  const networkQuality = getNetworkQuality();

  // Get sync config based on network quality
  const getSyncConfig = () => {
    const type = networkQuality.effectiveType;
    return SYNC_CONFIG[type as keyof typeof SYNC_CONFIG] || SYNC_CONFIG['3g'];
  };

  // Initialize IndexedDB and service worker
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setIsLoading(true);

        // Initialize IndexedDB
        await indexedDB.init();

        // Get initial stats
        const initialStats = await indexedDB.getOfflineStats();
        if (mounted) {
          setStats(initialStats);
          setIsOnline(initialStats.isOnline);
        }

        // Register service worker
        if ('serviceWorker' in navigator && swRef.current === null) {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            type: 'classic',
          }) as ServiceWorkerRegistrationWithSync;
          swRef.current = registration;

          console.log('[useOfflineSyncEnhanced] Service Worker registered');

          // Register background sync
          if ('sync' in registration) {
            await registration.sync.register('lmd-sync');
            console.log('[useOfflineSyncEnhanced] Background sync registered');
          }
        }

        // Set up network listeners
        const cleanup = setupNetworkListeners(
          async () => {
            console.log('[useOfflineSyncEnhanced] Device online');
            setIsOnline(true);
            await refreshStats();

            // Trigger sync when coming online
            if (swRef.current && 'sync' in swRef.current) {
              await swRef.current.sync.register('lmd-sync');
            }

            // Auto-sync when coming online
            if (!syncInProgress.current) {
              syncNow();
            }
          },
          async () => {
            console.log('[useOfflineSyncEnhanced] Device offline');
            setIsOnline(false);
            await refreshStats();
          }
        );

        // Set up message listener for service worker communication
        navigator.serviceWorker.addEventListener('message', handleSWMessage);

        if (mounted) {
          setIsLoading(false);
        }

        return () => {
          cleanup();
          navigator.serviceWorker.removeEventListener('message', handleSWMessage);
        };
      } catch (err) {
        console.error('[useOfflineSyncEnhanced] Init error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Handle messages from service worker
   */
  const handleSWMessage = useCallback(async (event: MessageEvent) => {
    const { type, recordId } = event.data;

    switch (type) {
      case 'get-lmd-records':
        // Send unsynced records to service worker
        const records = await indexedDB.getUnsyncedRecords();
        event.ports[0].postMessage({
          type: 'lmd-records-response',
          records,
        });
        break;

      case 'mark-synced':
        // Mark record as synced
        await indexedDB.markAsSynced(recordId);
        await refreshStats();
        break;

      case 'get-retry-count':
        // Get retry count for a record
        const syncQueue = await indexedDB.getSyncQueue();
        const item = syncQueue.find((i) => i.recordId === recordId);
        event.ports[0].postMessage({
          type: 'retry-count-response',
          count: item?.retryCount || 0,
        });
        break;

      case 'increment-retry':
        // Increment retry count
        await indexedDB.updateSyncQueueItem(`sync-${recordId}`, {
          retryCount: (await getRetryCount(recordId)) + 1,
          lastAttempt: new Date().toISOString(),
        });
        break;

      case 'sync-complete':
        // Sync completed
        console.log('[useOfflineSyncEnhanced] Sync complete:', event.data);
        await refreshStats();
        break;

      case 'sync-failed':
        // Sync failed for a record
        console.error('[useOfflineSyncEnhanced] Sync failed:', event.data);
        setError(`Failed to sync record: ${event.data.recordId}`);
        break;

      default:
        console.log('[useOfflineSyncEnhanced] Unknown SW message:', type);
    }
  }, []);

  /**
   * Get retry count for a record
   */
  const getRetryCount = async (recordId: string): Promise<number> => {
    const syncQueue = await indexedDB.getSyncQueue();
    const item = syncQueue.find((i) => i.recordId === recordId);
    return item?.retryCount || 0;
  };

  /**
   * Refresh stats from IndexedDB
   */
  const refreshStats = useCallback(async () => {
    try {
      const newStats = await indexedDB.getOfflineStats();
      setStats(newStats);
    } catch (err) {
      console.error('[useOfflineSyncEnhanced] Failed to refresh stats:', err);
    }
  }, []);

  /**
   * Add a new LMD record
   */
  const addRecord = useCallback(async (data: Partial<LMDRecord>) => {
    try {
      setError(null);
      const record = createLMDRecord(data);
      await indexedDB.addLMDRecord(record);
      await refreshStats();

      // If online, queue sync
      if (isOnline) {
        requestQueue.add(() => syncNow());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, [refreshStats, isOnline]);

  /**
   * Get all LMD records
   */
  const getRecords = useCallback(async (): Promise<LMDRecord[]> => {
    try {
      setError(null);
      const { records } = await indexedDB.exportAllData();
      return records;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, []);

  /**
   * Get unsynced records
   */
  const getUnsyncedRecords = useCallback(async (): Promise<LMDRecord[]> => {
    try {
      setError(null);
      return await indexedDB.getUnsyncedRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, []);

  /**
   * Sync a single record
   */
  const syncRecord = async (record: LMDRecord): Promise<boolean> => {
    try {
      const config = getSyncConfig();

      await optimizedFetch('/api/v1/lmd/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
        compress: true,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
      });

      await indexedDB.markAsSynced(record.id);
      return true;
    } catch (err) {
      console.error(`[useOfflineSyncEnhanced] Failed to sync ${record.id}:`, err);
      return false;
    }
  };

  /**
   * Sync records in batches
   */
  const syncBatch = useCallback(async (batchSize?: number) => {
    if (syncInProgress.current || !isOnline) {
      return;
    }

    syncInProgress.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const config = getSyncConfig();
      const size = batchSize || config.batchSize;
      const records = await indexedDB.getUnsyncedRecords();

      setSyncProgress({
        total: records.length,
        synced: 0,
        failed: 0,
      });

      // Process records in batches
      for (let i = 0; i < records.length; i += size) {
        const batch = records.slice(i, i + size);
        const results = await Promise.allSettled(
          batch.map((record) => syncRecord(record))
        );

        // Update progress
        const synced = results.filter((r) => r.status === 'fulfilled' && r.value).length;
        const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value)).length;

        setSyncProgress((prev) => ({
          ...prev,
          synced: prev.synced + synced,
          failed: prev.failed + failed,
        }));

        // Delay between batches for slow networks
        if (i + size < records.length) {
          await new Promise((resolve) => setTimeout(resolve, config.delayBetweenBatches));
        }
      }

      await refreshStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      syncInProgress.current = false;
      setIsLoading(false);
    }
  }, [isOnline, refreshStats, networkQuality]);

  /**
   * Manually trigger sync
   */
  const syncNow = useCallback(async () => {
    if (syncInProgress.current || !isOnline) {
      return;
    }

    syncInProgress.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const records = await indexedDB.getUnsyncedRecords();

      setSyncProgress({
        total: records.length,
        synced: 0,
        failed: 0,
      });

      // Sync all records
      for (const record of records) {
        const success = await syncRecord(record);

        if (success) {
          setSyncProgress((prev) => ({
            ...prev,
            synced: prev.synced + 1,
          }));
        } else {
          setSyncProgress((prev) => ({
            ...prev,
            failed: prev.failed + 1,
          }));
        }
      }

      await refreshStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      syncInProgress.current = false;
      setIsLoading(false);
    }
  }, [isOnline, refreshStats]);

  /**
   * Clear all data
   */
  const clearAll = useCallback(async () => {
    try {
      setError(null);
      await indexedDB.clearAll();
      await refreshStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, [refreshStats]);

  return {
    stats,
    isOnline,
    networkQuality,
    addRecord,
    getRecords,
    getUnsyncedRecords,
    syncNow,
    syncBatch,
    clearAll,
    isLoading,
    error,
    syncProgress,
  };
}
