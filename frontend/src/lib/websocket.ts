/**
 * VaxTrace WebSocket Client Service
 * 
 * Handles real-time communication with the backend WebSocket server.
 * Integrates with the Zustand store for automatic state updates.
 */

import { io, Socket } from 'socket.io-client';
import { useVaxTraceStore } from '@/store/useVaxTraceStore';

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

class WebSocketService {
  private socket: Socket<any, VaxTraceEvents> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

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

    console.log('[WebSocket] Connecting to:', wsUrl);

    this.socket = io(`${wsUrl}/vaxtrace`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000,
      autoConnect: true,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for WebSocket events
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection established
    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      useVaxTraceStore.getState().setOfflineStatus({
        isOffline: false,
        lastSync: new Date().toISOString(),
        pendingChanges: 0,
      });
    });

    // Connection event from server
    this.socket.on('connected', (data: ConnectionEvent) => {
      console.log('[WebSocket] Server confirmed connection:', data);
    });

    // Disconnection
    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.isConnecting = false;
      useVaxTraceStore.getState().setOfflineStatus({
        isOffline: true,
        lastSync: new Date().toISOString(),
        pendingChanges: 0,
      });

      // Attempt reconnection if not intentional
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.socket?.connect();
      }
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      this.isConnecting = false;
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[WebSocket] Max reconnection attempts reached');
        useVaxTraceStore.getState().setOfflineStatus({
          isOffline: true,
          lastSync: new Date().toISOString(),
          pendingChanges: 0,
        });
      }
    });

    // Stock update event
    this.socket.on('stock:update', (data: StockUpdateEvent) => {
      console.log('[WebSocket] Stock update received:', data);
      this.handleStockUpdate(data);
    });

    // New alert event
    this.socket.on('alert:new', (data: AlertEvent) => {
      console.log('[WebSocket] New alert received:', data);
      this.handleNewAlert(data);
    });

    // Alert resolved event
    this.socket.on('alert:resolved', (data: { alertId: string; resolvedAt: string }) => {
      console.log('[WebSocket] Alert resolved:', data);
      this.handleAlertResolved(data);
    });

    // Map update event
    this.socket.on('map:update', (data: MapUpdateEvent) => {
      console.log('[WebSocket] Map update received:', data);
      this.handleMapUpdate(data);
    });

    // Facility update event
    this.socket.on('facility:update', (data: { facilityId: string; updates: any }) => {
      console.log('[WebSocket] Facility update received:', data);
      this.handleFacilityUpdate(data);
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
      console.log('[WebSocket] Joined facility room:', facilityId);
    }
  }

  /**
   * Leave a facility room
   */
  leaveFacilityRoom(facilityId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_facility', { facilityId });
      console.log('[WebSocket] Left facility room:', facilityId);
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

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnecting = false;
    console.log('[WebSocket] Disconnected');
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
}

// Export singleton instance
export const webSocketService = new WebSocketService();

// Export hook for React components
export function useWebSocket() {
  return {
    connect: () => webSocketService.connect(),
    disconnect: () => webSocketService.disconnect(),
    isConnected: () => webSocketService.isConnected(),
    joinFacilityRoom: (facilityId: string) => webSocketService.joinFacilityRoom(facilityId),
    leaveFacilityRoom: (facilityId: string) => webSocketService.leaveFacilityRoom(facilityId),
    getSocketId: () => webSocketService.getSocketId(),
  };
}
