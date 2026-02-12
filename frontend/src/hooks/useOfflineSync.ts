/**
 * VaxTrace Nigeria - Offline Sync Hook
 *
 * React hook for managing offline-first LMD data capture
 * Handles IndexedDB operations, service worker registration, and background sync
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { indexedDB, createLMDRecord, LMDRecord, OfflineStats, setupNetworkListeners } from '@/lib/indexeddb';

// Extend ServiceWorkerRegistration for background sync
interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync: {
    register(tag: string): Promise<void>;
  };
}

export interface UseOfflineSyncReturn {
  stats: OfflineStats | null;
  isOnline: boolean;
  addRecord: (record: Partial<LMDRecord>) => Promise<void>;
  getRecords: () => Promise<LMDRecord[]>;
  getUnsyncedRecords: () => Promise<LMDRecord[]>;
  syncNow: () => Promise<void>;
  clearAll: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [stats, setStats] = useState<OfflineStats | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const swRef = useRef<ServiceWorkerRegistrationWithSync | null>(null);

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
          
          console.log('[useOfflineSync] Service Worker registered');
          
          // Register background sync
          if ('sync' in registration) {
            await registration.sync.register('lmd-sync');
            console.log('[useOfflineSync] Background sync registered');
          }
        }
        
        // Set up network listeners
        const cleanup = setupNetworkListeners(
          async () => {
            console.log('[useOfflineSync] Device online');
            setIsOnline(true);
            await refreshStats();
            
            // Trigger sync when coming online
            if (swRef.current && 'sync' in swRef.current) {
              await swRef.current.sync.register('lmd-sync');
            }
          },
          async () => {
            console.log('[useOfflineSync] Device offline');
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
        console.error('[useOfflineSync] Init error:', err);
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
        console.log('[useOfflineSync] Sync complete:', event.data);
        await refreshStats();
        break;
        
      case 'sync-failed':
        // Sync failed for a record
        console.error('[useOfflineSync] Sync failed:', event.data);
        setError(`Failed to sync record: ${event.data.recordId}`);
        break;
        
      default:
        console.log('[useOfflineSync] Unknown SW message:', type);
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
      console.error('[useOfflineSync] Failed to refresh stats:', err);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, [refreshStats]);

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
   * Manually trigger sync
   */
  const syncNow = useCallback(async () => {
    try {
      setError(null);
      
      if (!isOnline) {
        throw new Error('Device is offline. Cannot sync.');
      }
      
      const records = await indexedDB.getUnsyncedRecords();
      
      for (const record of records) {
        try {
          const response = await fetch('/api/lmd/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(record),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          await indexedDB.markAsSynced(record.id);
        } catch (err) {
          console.error(`[useOfflineSync] Failed to sync ${record.id}:`, err);
          setError(`Failed to sync ${record.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      
      await refreshStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
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
    addRecord,
    getRecords,
    getUnsyncedRecords,
    syncNow,
    clearAll,
    isLoading,
    error,
  };
}
