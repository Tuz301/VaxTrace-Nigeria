'use client';

/**
 * VaxTrace WebSocket Provider
 * 
 * Manages WebSocket connection lifecycle based on authentication state.
 * Automatically connects/disconnects when user logs in/out.
 * 
 * Features:
 * - Auto-connect on authentication
 * - Auto-disconnect on logout
 * - Facility room management
 * - Connection status monitoring
 */

import { useEffect, useRef } from 'react';
import { useVaxTraceStore } from '@/store/useVaxTraceStore';
import { webSocketService } from '@/lib/websocket';

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useVaxTraceStore((state) => state.isAuthenticated);
  const selectedNode = useVaxTraceStore((state) => state.selectedNode);
  const previousAuthState = useRef<boolean>(false);
  const previousFacilityId = useRef<string | null>(null);

  useEffect(() => {
    // Connect when user becomes authenticated
    if (isAuthenticated && !previousAuthState.current) {
      console.log('[WebSocketProvider] User authenticated, connecting WebSocket...');
      webSocketService.connect();
      previousAuthState.current = true;
    }

    // Disconnect when user logs out
    if (!isAuthenticated && previousAuthState.current) {
      console.log('[WebSocketProvider] User logged out, disconnecting WebSocket...');
      webSocketService.disconnect();
      previousAuthState.current = false;
    }
  }, [isAuthenticated]);

  // Manage facility room subscriptions
  useEffect(() => {
    const currentFacilityId = selectedNode?.id ?? null;

    // Leave previous room if facility changed
    if (previousFacilityId.current && previousFacilityId.current !== currentFacilityId) {
      console.log('[WebSocketProvider] Leaving facility room:', previousFacilityId.current);
      webSocketService.leaveFacilityRoom(previousFacilityId.current);
    }

    // Join new room if facility is selected
    if (currentFacilityId && currentFacilityId !== previousFacilityId.current) {
      console.log('[WebSocketProvider] Joining facility room:', currentFacilityId);
      webSocketService.joinFacilityRoom(currentFacilityId);
    }

    previousFacilityId.current = currentFacilityId;
  }, [selectedNode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[WebSocketProvider] Provider unmounting, disconnecting WebSocket...');
      webSocketService.disconnect();
    };
  }, []);

  return <>{children}</>;
}

/**
 * Hook to access WebSocket connection status
 */
export function useWebSocketStatus() {
  return {
    isConnected: webSocketService.isConnected(),
    socketId: webSocketService.getSocketId(),
  };
}
