/**
 * VaxTrace Nigeria - WebSocket Gateway
 *
 * Real-time bidirectional communication for live updates
 * Handles client connections and broadcasts
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WebSocketService } from './websocket.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure appropriately for production
    credentials: true,
  },
  namespace: '/vaxtrace',
})
export class VaxTraceGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VaxTraceGateway.name);

  constructor(private readonly webSocketService: WebSocketService) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.webSocketService.addClient(client);

    // Send welcome message with current state
    client.emit('connected', {
      message: 'Connected to VaxTrace real-time updates',
      timestamp: new Date().toISOString(),
    });

    // Join default rooms
    client.join('global-updates');
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.webSocketService.removeClient(client);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    this.logger.log(`Client ${client.id} joining room: ${data.room}`);
    client.join(data.room);
    client.emit('joined-room', { room: data.room });
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    this.logger.log(`Client ${client.id} leaving room: ${data.room}`);
    client.leave(data.room);
    client.emit('left-room', { room: data.room });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }
}
