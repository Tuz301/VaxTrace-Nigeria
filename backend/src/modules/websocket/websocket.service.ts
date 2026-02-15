/**
 * VaxTrace Nigeria - WebSocket Service
 *
 * Manages WebSocket connections and broadcasts real-time updates
 * Integrates with cache invalidation and webhook events
 */

import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnGatewayInit } from '@nestjs/websockets';
import { CacheService } from '../cache/cache.service';

export interface StockUpdateEvent {
  type: 'stock_update';
  facilityId: string;
  data: any;
  timestamp: string;
}

export interface AlertEvent {
  type: 'alert';
  alert: any;
  timestamp: string;
}

export interface MapUpdateEvent {
  type: 'map_update';
  data: any;
  timestamp: string;
}

export type RealTimeEvent = StockUpdateEvent | AlertEvent | MapUpdateEvent;

@Injectable()
export class WebSocketService implements OnGatewayInit {
  private readonly logger = new Logger(WebSocketService.name);
  private server: Server;
  private connectedClients: Set<Socket> = new Set();

  constructor(private readonly cacheService: CacheService) {
    this.logger.log('WebSocket Service initialized');
  }

  setServer(server: Server) {
    this.server = server;
    this.logger.log('Socket.IO server instance set');
    this.setupCacheInvalidationListener();
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    this.server = server;
    this.setupCacheInvalidationListener();
  }

  /**
   * Track connected clients
   */
  addClient(client: Socket) {
    this.connectedClients.add(client);
    this.logger.debug(`Total connected clients: ${this.connectedClients.size}`);
  }

  removeClient(client: Socket) {
    this.connectedClients.delete(client);
    this.logger.debug(`Total connected clients: ${this.connectedClients.size}`);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: any) {
    if (this.server) {
      this.server.emit(event, data);
      this.logger.debug(`Broadcasted ${event} to all clients`);
    }
  }

  /**
   * Broadcast to specific room
   */
  broadcastToRoom(room: string, event: string, data: any) {
    if (this.server) {
      this.server.to(room).emit(event, data);
      this.logger.debug(`Broadcasted ${event} to room: ${room}`);
    }
  }

  /**
   * Send to specific client
   */
  sendToClient(clientId: string, event: string, data: any) {
    if (this.server) {
      this.server.to(clientId).emit(event, data);
      this.logger.debug(`Sent ${event} to client: ${clientId}`);
    }
  }

  /**
   * Broadcast stock update
   */
  broadcastStockUpdate(facilityId: string, data: any) {
    const event: StockUpdateEvent = {
      type: 'stock_update',
      facilityId,
      data,
      timestamp: new Date().toISOString(),
    };

    this.broadcast('stock:update', event);
    this.broadcastToRoom(`facility:${facilityId}`, 'stock:update', event);
  }

  /**
   * Broadcast new alert
   */
  broadcastAlert(alert: any) {
    const event: AlertEvent = {
      type: 'alert',
      alert,
      timestamp: new Date().toISOString(),
    };

    this.broadcast('alert:new', event);
    this.broadcastToRoom('alerts', 'alert:new', event);
  }

  /**
   * Broadcast map data update
   */
  broadcastMapUpdate(data: any) {
    const event: MapUpdateEvent = {
      type: 'map_update',
      data,
      timestamp: new Date().toISOString(),
    };

    this.broadcast('map:update', event);
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      connectedClients: this.connectedClients.size,
      rooms: this.server ? this.server.sockets.adapter.rooms.size : 0,
    };
  }

  /**
   * Setup cache invalidation listener for real-time updates
   */
  private setupCacheInvalidationListener() {
    // Subscribe to Redis cache invalidation events
    this.cacheService.subscribeInvalidation(
      'stock',
      async (message) => {
        const { key, timestamp } = JSON.parse(message);
        this.logger.log(`Cache invalidation received for stock: ${key}`);

        // Extract facility ID from key
        const facilityId = key.split(':')[1] || 'unknown';
        
        // Broadcast to all connected clients
        this.broadcast('cache:invalidated', {
          type: 'stock',
          key,
          facilityId,
          timestamp,
        });
      },
    ).catch((error) => {
      this.logger.error('Failed to setup cache invalidation listener:', error);
    });
  }
}
