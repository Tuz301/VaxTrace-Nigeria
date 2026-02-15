/**
 * VaxTrace Enhanced WebSocket Client for 3G/4G Networks
 *
 * Optimized for unstable connections with:
 * - Message queuing during offline periods
 * - Automatic reconnection with exponential backoff
 * - Heartbeat monitoring
 * - Message deduplication
 * - Network-aware connection management
 */

import { io, Socket } from 'socket.io-client';
import { useVaxTraceStore } from '@/store/useVaxTraceStore';
import { getNetworkQuality } from './api-optimizations';

// WebSocket event types matching the backend
export interface StockUpdateEvent {
  type: 'stock_update';
  facilityId: string;
  data: {
    productId: string;
    quantity: number;
    lotNumber?: string;
    expiryDate?: string;
    lastUpdated: string;
  };
  timestamp: string;
}

export interface AlertEvent {
  type: 'alert';
  alert: {
    id: string;
    facilityId: string;
    type: 'stockout' | 'near_expiry' | 'temperature_excursion' | 'vvm_stage_3' | 'vvm_stage_4' | 'power_outage' | 'delivery_delay';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    productId?: string;
    productName?: string;
    quantity?: number;
    expiryDate?: string;
    createdAt: string;
  };
  timestamp: string;
}

export interface MapUpdateEvent {
  type: 'map_update';
  updates: {
    facilityId: string;
    stockStatus: 'OPTIMAL' | 'UNDERSTOCKED' | 'STOCKOUT' | 'OVERSTOCKED';
    alertCount: number;
  }[];
  timestamp: string;
}

export interface ConnectionEvent {
  type: 'connected' | 'disconnected';
  message: string;
  timestamp: string;
}

type VaxTraceEvents = {
  connected: (data: ConnectionEvent) => void;
  disconnected: (data: ConnectionEvent) => void;
  'stock:update': (data: StockUpdateEvent) => void;
  'alert:new': (data: AlertEvent) => void;
  'alert:resolved': (data: { alertId: string; resolvedAt: string }) => void;
  'map:update': (data: MapUpdateEvent) => void;
  'facility:update': (data: { facilityId: string; updates: any }) => void;
  join_facility: (data: { facilityId: string }) => void;
  leave_facility: (data: { facilityId: string }) => void;
};

// Message queue for offline periods
interface QueuedMessage {
  event: string;
  data: any;
  timestamp: number;
  id: string;
}

// Connection configuration for different network types
const CONNECTION_CONFIG = {
  'slow-2g': {
    pingInterval: 60000,
    pingTimeout: 30000,
    reconnectionDelay: 5000,
    reconnectionDelayMax: 30000,
    maxReconnectionAttempts: 10,
    messageQueueMaxSize: 50,
  },
  '2g': {
    pingInterval: 45000,
    pingTimeout: 25000,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 20000,
    maxReconnectionAttempts: 8,
    messageQueueMaxSize: 100,
  },
  '3g': {
    pingInterval: 30000,
    pingTimeout: 15000,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    maxReconnectionAttempts: 5,
    messageQueueMaxSize: 200,
  },
  '4g': {
    pingInterval: 25000,
    pingTimeout: 5000,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    maxReconnectionAttempts: 3,
    messageQueueMaxSize: 500,
  },
};

class EnhancedWebSocketService {
  private socket: Socket<any, VaxTraceEvents> | null = null;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: QueuedMessage[] = [];
  private processedMessages = new Set<string>();
  private networkQuality = getNetworkQuality();
  private config = CONNECTION_CONFIG[this.networkQuality.effectiveType as keyof typeof CONNECTION_CONFIG] || CONNECTION_CONFIG['3g'];

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    // Get backend URL from environment or use default
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ||
                  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
                    ? 'http://localhost:3001'
                    : window.location.origin);

    console.log('[EnhancedWebSocket] Connecting to:', wsUrl);
    console.log('[EnhancedWebSocket] Network quality:', this.networkQuality.effectiveType);

    this.socket = io(`${wsUrl}/vaxtrace`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.config.reconnectionDelay,
      reconnectionDelayMax: this.config.reconnectionDelayMax,
      reconnectionAttempts: this.config.maxReconnectionAttempts,
      timeout: 20000,
      autoConnect: true,
    }) as Socket<any, VaxTraceEvents>;

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for WebSocket events
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection established
    this.socket.on('connect', () => {
      console.log('[EnhancedWebSocket] Connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.isConnecting = false;

      // Update network quality
      this.networkQuality = getNetworkQuality();
      this.config = CONNECTION_CONFIG[this.networkQuality.effectiveType as keyof typeof CONNECTION_CONFIG] || CONNECTION_CONFIG['3g'];

      // Send queued messages
      this.flushMessageQueue();

      // Start heartbeat
      this.startHeartbeat();

      // Update store
      useVaxTraceStore.getState().setOfflineStatus({
        isOffline: false,
        lastSync: new Date().toISOString(),
        pendingChanges: this.messageQueue.length,
      });
    });

    // Connection event from server
    this.socket.on('connected', (data: ConnectionEvent) => {
      console.log('[EnhancedWebSocket] Server confirmed connection:', data);
    });

    // Disconnection
    this.socket.on('disconnect', (reason) => {
      console.log('[EnhancedWebSocket] Disconnected:', reason);
      this.isConnecting = false;

      // Stop heartbeat
      this.stopHeartbeat();

      // Update store
      useVaxTraceStore.getState().setOfflineStatus({
        isOffline: true,
        lastSync: new Date().toISOString(),
        pendingChanges: this.messageQueue.length,
      });

      // Attempt reconnection if not intentional
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.socket?.connect();
      }
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('[EnhancedWebSocket] Connection error:', error);
      this.isConnecting = false;
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.config.maxReconnectionAttempts) {
        console.error('[EnhancedWebSocket] Max reconnection attempts reached');
        useVaxTraceStore.getState().setOfflineStatus({
          isOffline: true,
          lastSync: new Date().toISOString(),
          pendingChanges: this.messageQueue.length,
        });
      }
    });

    // Stock update event
    this.socket.on('stock:update', (data: StockUpdateEvent) => {
      this.handleStockUpdate(data);
    });

    // New alert event
    this.socket.on('alert:new', (data: AlertEvent) => {
      this.handleNewAlert(data);
    });

    // Alert resolved event
    this.socket.on('alert:resolved', (data: { alertId: string; resolvedAt: string }) => {
      this.handleAlertResolved(data);
    });

    // Map update event
    this.socket.on('map:update', (data: MapUpdateEvent) => {
      this.handleMapUpdate(data);
    });

    // Facility update event
    this.socket.on('facility:update', (data: { facilityId: string; updates: any }) => {
      this.handleFacilityUpdate(data);
    });
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        // Use a generic emit for ping
        (this.socket as any).emit('ping');
      }
    }, this.config.pingInterval);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Queue a message for later sending
   */
  private queueMessage(event: string, data: any): void {
    const messageId = `${event}-${Date.now()}-${Math.random()}`;

    // Check if message was already processed
    if (this.processedMessages.has(messageId)) {
      return;
    }

    // Add to queue
    this.messageQueue.push({
      event,
      data,
      timestamp: Date.now(),
      id: messageId,
    });

    // Limit queue size
    if (this.messageQueue.length > this.config.messageQueueMaxSize) {
      this.messageQueue.shift();
    }

    // Mark as processed
    this.processedMessages.add(messageId);

    // Clean up old processed messages
    if (this.processedMessages.size > 1000) {
      const oldMessages = Array.from(this.processedMessages).slice(0, 500);
      oldMessages.forEach(id => this.processedMessages.delete(id));
    }

    console.log('[EnhancedWebSocket] Message queued:', event, 'Queue size:', this.messageQueue.length);
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) {
      return;
    }

    console.log('[EnhancedWebSocket] Flushing message queue:', this.messageQueue.length);

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach(({ event, data }) => {
      if (this.socket?.connected) {
        // Use generic emit for queued messages
        (this.socket as any).emit(event, data);
      }
    });

    // Update store
    useVaxTraceStore.getState().setOfflineStatus({
      isOffline: false,
      lastSync: new Date().toISOString(),
      pendingChanges: this.messageQueue.length,
    });
  }

  /**
   * Handle stock update events
   */
  private handleStockUpdate(event: StockUpdateEvent): void {
    const { facilityId, data } = event;
    const store = useVaxTraceStore.getState();

    // Update stock data in store
    const existingItem = store.stockData.find(
      (item) => item.facilityCode === facilityId && item.productCode === data.productId
    );

    if (existingItem) {
      store.updateStockItem(existingItem.nodeId, {
        quantity: data.quantity,
        lotCode: data.lotNumber || '',
        lotExpiry: data.expiryDate || '',
        lastUpdated: data.lastUpdated,
      });
    }
    // If item doesn't exist, we'll let the next API fetch handle it
    // to avoid creating inconsistent data
  }

  /**
   * Handle new alert events
   */
  private handleNewAlert(event: AlertEvent): void {
    const { alert } = event;
    const store = useVaxTraceStore.getState();

    // Add alert to store if not already present
    const existingAlert = store.alerts.find((a) => a.id === alert.id);
    if (!existingAlert) {
      store.addAlert({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        facilityId: alert.facilityId,
        facilityName: alert.facilityId, // Will be resolved by API
        state: '', // Will be resolved by API
        lga: '', // Will be resolved by API
        message: alert.message,
        createdAt: alert.createdAt,
        isResolved: false,
      });
    }
  }

  /**
   * Handle alert resolved events
   */
  private handleAlertResolved(data: { alertId: string; resolvedAt: string }): void {
    const store = useVaxTraceStore.getState();
    store.resolveAlert(data.alertId);
  }

  /**
   * Handle map update events
   */
  private handleMapUpdate(event: MapUpdateEvent): void {
    const { updates } = event;
    const store = useVaxTraceStore.getState();
    const currentNodes = store.mapNodes;

    // Update map nodes with new data
    const updatedNodes = currentNodes.map((node) => {
      const update = updates.find((u) => u.facilityId === node.code);
      if (update) {
        return {
          ...node,
          stockStatus: update.stockStatus,
          alertCount: update.alertCount,
        };
      }
      return node;
    });

    store.setMapNodes(updatedNodes);
  }

  /**
   * Handle facility update events
   */
  private handleFacilityUpdate(data: { facilityId: string; updates: any }): void {
    const { facilityId, updates } = data;
    const store = useVaxTraceStore.getState();
    const currentNodes = store.mapNodes;

    // Update specific facility node
    const updatedNodes = currentNodes.map((node) => {
      if (node.code === facilityId) {
        return { ...node, ...updates };
      }
      return node;
    });

    store.setMapNodes(updatedNodes);
  }

  /**
   * Join a room for specific facility updates
   */
  joinFacilityRoom(facilityId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join_facility', { facilityId });
      console.log('[EnhancedWebSocket] Joined facility room:', facilityId);
    } else {
      // Queue for later
      this.queueMessage('join_facility', { facilityId });
    }
  }

  /**
   * Leave a facility room
   */
  leaveFacilityRoom(facilityId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_facility', { facilityId });
      console.log('[EnhancedWebSocket] Left facility room:', facilityId);
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnecting = false;
    console.log('[EnhancedWebSocket] Disconnected');
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    queuedMessages: number;
    networkQuality: ReturnType<typeof getNetworkQuality>;
  } {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      networkQuality: this.networkQuality,
    };
  }
}

// Export singleton instance
export const enhancedWebSocketService = new EnhancedWebSocketService();

// Export hook for React components
export function useEnhancedWebSocket() {
  return {
    connect: () => enhancedWebSocketService.connect(),
    disconnect: () => enhancedWebSocketService.disconnect(),
    isConnected: () => enhancedWebSocketService.isConnected(),
    joinFacilityRoom: (facilityId: string) => enhancedWebSocketService.joinFacilityRoom(facilityId),
    leaveFacilityRoom: (facilityId: string) => enhancedWebSocketService.leaveFacilityRoom(facilityId),
    getSocketId: () => enhancedWebSocketService.getSocketId(),
    getStatus: () => enhancedWebSocketService.getStatus(),
  };
}
