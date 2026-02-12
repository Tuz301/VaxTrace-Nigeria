/**
 * VaxTrace Nigeria - IndexedDB Local Persistence Layer
 * 
 * Offline-first storage for Last-Mile Delivery (LMD) data
 * Enables field officers to work in areas with zero or intermittent signal
 * 
 * Features:
 * - Local storage of LMD KPIs (delivery timestamps, VVM status, GPS coordinates)
 * - Automatic sync when device reconnects to 2G/3G network
 * - Queue-based data management for background sync
 * - Protobuf-ready data structure
 * 
 * @see https://github.com/jakearchibald/idb
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface LMDRecord {
  id: string;
  facilityId: string;
  facilityName: string;
  lgaCode: string;
  stateCode: string;
  deliveryTimestamp: string;
  vvmStatus: 'OK' | 'WARNING' | 'CRITICAL' | 'NOT_TESTED';
  vehicleGPS?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  };
  deliveryItems: LMDDeliveryItem[];
  officerId: string;
  officerName: string;
  synced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LMDDeliveryItem {
  productCode: string;
  productName: string;
  quantityDelivered: number;
  quantityReceived: number;
  batchNumber: string;
  expiryDate: string;
  vvmStatus: string;
  coldChainBreak: boolean;
  notes?: string;
}

export interface LMDSyncQueue {
  id: string;
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: LMDRecord;
  retryCount: number;
  lastAttempt?: string;
  error?: string;
  createdAt: string;
}

export interface OfflineStats {
  pendingSync: number;
  syncedToday: number;
  lastSyncTime?: string;
  isOnline: boolean;
}

// ============================================
// DATABASE SCHEMA
// ============================================

interface VaxTraceDB extends DBSchema {
  'lmd-records': {
    key: string;
    value: LMDRecord;
    indexes: {
      'by-facility': string;
      'by-state': string;
      'by-lga': string;
      'by-sync-status': number;
      'by-date': string;
    };
  };
  'lmd-sync-queue': {
    key: string;
    value: LMDSyncQueue;
    indexes: {
      'by-retry-count': number;
      'by-created': string;
    };
  };
  'lmd-offline-stats': {
    key: string;
    value: OfflineStats;
  };
}

// ============================================
// DATABASE NAME & VERSION
// ============================================

const DB_NAME = 'VaxTraceLMD';
const DB_VERSION = 1;

// ============================================
// INDEXEDDB SERVICE
// ============================================

class IndexedDBService {
  private db: IDBPDatabase<VaxTraceDB> | null = null;
  private initPromise: Promise<IDBPDatabase<VaxTraceDB>> | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<IDBPDatabase<VaxTraceDB>> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = openDB<VaxTraceDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create LMD records store
        if (!db.objectStoreNames.contains('lmd-records')) {
          const lmdStore = db.createObjectStore('lmd-records', { keyPath: 'id' });
          lmdStore.createIndex('by-facility', 'facilityId');
          lmdStore.createIndex('by-state', 'stateCode');
          lmdStore.createIndex('by-lga', 'lgaCode');
          lmdStore.createIndex('by-sync-status', 'synced');
          lmdStore.createIndex('by-date', 'deliveryTimestamp');
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains('lmd-sync-queue')) {
          const syncStore = db.createObjectStore('lmd-sync-queue', { keyPath: 'id' });
          syncStore.createIndex('by-retry-count', 'retryCount');
          syncStore.createIndex('by-created', 'createdAt');
        }

        // Create offline stats store
        if (!db.objectStoreNames.contains('lmd-offline-stats')) {
          db.createObjectStore('lmd-offline-stats', { keyPath: 'id' });
        }
      },
    });

    this.db = await this.initPromise;
    return this.db;
  }

  /**
   * Add a new LMD record
   */
  async addLMDRecord(record: LMDRecord): Promise<void> {
    const db = await this.init();
    await db.put('lmd-records', record);
    
    // Add to sync queue
    await this.addToSyncQueue(record);
    
    // Update stats
    await this.updateStats();
  }

  /**
   * Get an LMD record by ID
   */
  async getLMDRecord(id: string): Promise<LMDRecord | undefined> {
    const db = await this.init();
    return db.get('lmd-records', id);
  }

  /**
   * Get all LMD records for a facility
   */
  async getLMDRecordsByFacility(facilityId: string): Promise<LMDRecord[]> {
    const db = await this.init();
    return db.getAllFromIndex('lmd-records', 'by-facility', facilityId);
  }

  /**
   * Get all LMD records for a state
   */
  async getLMDRecordsByState(stateCode: string): Promise<LMDRecord[]> {
    const db = await this.init();
    return db.getAllFromIndex('lmd-records', 'by-state', stateCode);
  }

  /**
   * Get all unsynced LMD records
   */
  async getUnsyncedRecords(): Promise<LMDRecord[]> {
    const db = await this.init();
    return db.getAllFromIndex('lmd-records', 'by-sync-status', 0);
  }

  /**
   * Update an LMD record
   */
  async updateLMDRecord(record: LMDRecord): Promise<void> {
    const db = await this.init();
    await db.put('lmd-records', record);
    
    // Add to sync queue if not synced
    if (!record.synced) {
      await this.addToSyncQueue(record);
    }
    
    await this.updateStats();
  }

  /**
   * Mark a record as synced
   */
  async markAsSynced(recordId: string): Promise<void> {
    const record = await this.getLMDRecord(recordId);
    if (record) {
      record.synced = true;
      record.updatedAt = new Date().toISOString();
      await this.updateLMDRecord(record);
      
      // Remove from sync queue
      const db = await this.init();
      await db.delete('lmd-sync-queue', `sync-${recordId}`);
      
      await this.updateStats();
    }
  }

  /**
   * Delete an LMD record
   */
  async deleteLMDRecord(recordId: string): Promise<void> {
    const db = await this.init();
    await db.delete('lmd-records', recordId);
    await db.delete('lmd-sync-queue', `sync-${recordId}`);
    await this.updateStats();
  }

  /**
   * Add a record to the sync queue
   */
  async addToSyncQueue(record: LMDRecord): Promise<void> {
    const db = await this.init();
    const syncItem: LMDSyncQueue = {
      id: `sync-${record.id}`,
      recordId: record.id,
      action: record.synced ? 'UPDATE' : 'CREATE',
      payload: record,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
    await db.put('lmd-sync-queue', syncItem);
  }

  /**
   * Get all items from sync queue
   */
  async getSyncQueue(): Promise<LMDSyncQueue[]> {
    const db = await this.init();
    return db.getAll('lmd-sync-queue');
  }

  /**
   * Update sync queue item (increment retry count, add error)
   */
  async updateSyncQueueItem(
    id: string,
    updates: Partial<LMDSyncQueue>
  ): Promise<void> {
    const db = await this.init();
    const item = await db.get('lmd-sync-queue', id);
    if (item) {
      const updated = { ...item, ...updates };
      await db.put('lmd-sync-queue', updated);
    }
  }

  /**
   * Remove item from sync queue
   */
  async removeFromSyncQueue(id: string): Promise<void> {
    const db = await this.init();
    await db.delete('lmd-sync-queue', id);
  }

  /**
   * Get offline statistics
   */
  async getOfflineStats(): Promise<OfflineStats> {
    const db = await this.init();
    let stats = await db.get('lmd-offline-stats', 'stats');
    
    if (!stats) {
      stats = {
        pendingSync: 0,
        syncedToday: 0,
        isOnline: navigator.onLine,
      };
      await db.put('lmd-offline-stats', stats, 'stats');
    } else {
      // Update online status
      stats.isOnline = navigator.onLine;
      await db.put('lmd-offline-stats', stats, 'stats');
    }
    
    return stats;
  }

  /**
   * Update offline statistics
   */
  async updateStats(): Promise<void> {
    const db = await this.init();
    const unsynced = await this.getUnsyncedRecords();
    const stats = await this.getOfflineStats();
    
    stats.pendingSync = unsynced.length;
    stats.isOnline = navigator.onLine;
    
    await db.put('lmd-offline-stats', stats);
  }

  /**
   * Clear all data (useful for logout or testing)
   */
  async clearAll(): Promise<void> {
    const db = await this.init();
    await db.clear('lmd-records');
    await db.clear('lmd-sync-queue');
    await db.clear('lmd-offline-stats');
  }

  /**
   * Export all data for backup/protobuf serialization
   */
  async exportAllData(): Promise<{
    records: LMDRecord[];
    syncQueue: LMDSyncQueue[];
    stats: OfflineStats;
  }> {
    const db = await this.init();
    const records = await db.getAll('lmd-records');
    const syncQueue = await db.getAll('lmd-sync-queue');
    const stats = await this.getOfflineStats();
    
    return { records, syncQueue, stats };
  }

  /**
   * Import data (useful for restore or testing)
   */
  async importData(data: {
    records: LMDRecord[];
    syncQueue?: LMDSyncQueue[];
  }): Promise<void> {
    const db = await this.init();
    
    // Import records
    for (const record of data.records) {
      await db.put('lmd-records', record);
    }
    
    // Import sync queue
    if (data.syncQueue) {
      for (const item of data.syncQueue) {
        await db.put('lmd-sync-queue', item);
      }
    }
    
    await this.updateStats();
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const indexedDB = new IndexedDBService();

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate a unique ID for LMD records
 */
export function generateLMDRecordId(): string {
  return `lmd-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new LMD record with default values
 */
export function createLMDRecord(data: Partial<LMDRecord>): LMDRecord {
  return {
    id: generateLMDRecordId(),
    facilityId: data.facilityId || '',
    facilityName: data.facilityName || '',
    lgaCode: data.lgaCode || '',
    stateCode: data.stateCode || '',
    deliveryTimestamp: data.deliveryTimestamp || new Date().toISOString(),
    vvmStatus: data.vvmStatus || 'NOT_TESTED',
    vehicleGPS: data.vehicleGPS,
    deliveryItems: data.deliveryItems || [],
    officerId: data.officerId || '',
    officerName: data.officerName || '',
    synced: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function setupNetworkListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
