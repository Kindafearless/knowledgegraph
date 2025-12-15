'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ccvKeys } from './use-ccv';

const CCV_WS_URL = process.env.NEXT_PUBLIC_CCV_WS_URL || 'ws://localhost:8003';

interface CCVWebSocketMessage {
  type: string;
  data?: Record<string, unknown>;
  message?: string;
}

interface UseCCVWebSocketOptions {
  channel?: 'all' | 'suggestions';
  onMessage?: (message: CCVWebSocketMessage) => void;
  enabled?: boolean;
}

export function useCCVWebSocket(options: UseCCVWebSocketOptions = {}) {
  const { channel = 'all', onMessage, enabled = true } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<CCVWebSocketMessage | null>(null);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (!enabled) return;

    const endpoint = channel === 'suggestions' ? '/ws/suggestions' : '/ws/updates';
    const ws = new WebSocket(`${CCV_WS_URL}${endpoint}`);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('CCV WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message: CCVWebSocketMessage = JSON.parse(event.data);
        setLastMessage(message);

        // Handle ping/pong
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        // Invalidate relevant queries based on message type
        switch (message.type) {
          case 'term_created':
          case 'term_updated':
          case 'term_deleted':
            queryClient.invalidateQueries({ queryKey: ccvKeys.terms() });
            queryClient.invalidateQueries({ queryKey: ccvKeys.hierarchy() });
            break;

          case 'suggestion_created':
          case 'suggestion_reviewed':
            queryClient.invalidateQueries({ queryKey: ccvKeys.suggestions() });
            queryClient.invalidateQueries({ queryKey: ccvKeys.pendingSuggestions() });
            break;

          case 'synonym_added':
          case 'synonym_removed':
            queryClient.invalidateQueries({ queryKey: ccvKeys.terms() });
            break;
        }

        // Call custom handler
        onMessage?.(message);
      } catch (e) {
        console.error('Failed to parse CCV WebSocket message:', e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('CCV WebSocket disconnected');

      // Attempt to reconnect after 5 seconds
      if (enabled) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      }
    };

    ws.onerror = (error) => {
      console.error('CCV WebSocket error:', error);
      ws.close();
    };

    wsRef.current = ws;
  }, [enabled, channel, onMessage, queryClient]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback((subscribeChannel: string) => {
    sendMessage({ type: 'subscribe', channel: subscribeChannel });
  }, [sendMessage]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    subscribe,
    reconnect: connect,
    disconnect,
  };
}

// Hook specifically for the suggestion queue
export function useSuggestionNotifications(
  onNewSuggestion?: (suggestion: Record<string, unknown>) => void
) {
  const [newSuggestionCount, setNewSuggestionCount] = useState(0);

  const { isConnected } = useCCVWebSocket({
    channel: 'suggestions',
    onMessage: (message) => {
      if (message.type === 'suggestion_created') {
        setNewSuggestionCount((prev) => prev + 1);
        onNewSuggestion?.(message.data || {});
      }
    },
  });

  const clearNotifications = useCallback(() => {
    setNewSuggestionCount(0);
  }, []);

  return {
    isConnected,
    newSuggestionCount,
    clearNotifications,
  };
}
