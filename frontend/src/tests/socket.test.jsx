import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConnectionIndicator from '../components/common/ConnectionIndicator.jsx';
import * as useSocketModule from '../hooks/useSocket.js';
import * as SocketContextModule from '../context/SocketContext.jsx';
import * as AuthContextModule from '../context/AuthContext.jsx';
import { io } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const listeners = {};
  const mockSocket = {
    connected: false,
    connecting: false,
    on: vi.fn((event, cb) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    }),
    off: vi.fn((event, cb) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((fn) => fn !== cb);
      }
    }),
    emit: vi.fn(),
    connect: vi.fn(() => {
      mockSocket.connected = true;
      if (listeners['connect']) {
        listeners['connect'].forEach((cb) => cb());
      }
    }),
    disconnect: vi.fn(() => {
      mockSocket.connected = false;
      if (listeners['disconnect']) {
        listeners['disconnect'].forEach((cb) => cb('client disconnect'));
      }
    }),
    removeAllListeners: vi.fn(() => {
      Object.keys(listeners).forEach((k) => delete listeners[k]);
    }),
    io: {
      on: vi.fn(),
    },
  };

  return {
    io: vi.fn(() => mockSocket),
    mockSocket,
  };
});

describe('Phase 8 Frontend Tests: Real-Time Communication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ConnectionIndicator Component', () => {
    it('renders Live badge when connected', () => {
      vi.spyOn(useSocketModule, 'useSocket').mockReturnValue({
        isConnected: true,
        isConnecting: false,
        connectionError: null,
        reconnect: vi.fn(),
      });

      render(<ConnectionIndicator />);
      expect(screen.getByTestId('connection-indicator-connected')).toBeInTheDocument();
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('renders Syncing indicator when connecting', () => {
      vi.spyOn(useSocketModule, 'useSocket').mockReturnValue({
        isConnected: false,
        isConnecting: true,
        connectionError: null,
        reconnect: vi.fn(),
      });

      render(<ConnectionIndicator />);
      expect(screen.getByTestId('connection-indicator-connecting')).toBeInTheDocument();
      expect(screen.getByText('Syncing...')).toBeInTheDocument();
    });

    it('renders Offline button when disconnected and triggers reconnect on click', () => {
      const mockReconnect = vi.fn();
      vi.spyOn(useSocketModule, 'useSocket').mockReturnValue({
        isConnected: false,
        isConnecting: false,
        connectionError: 'Network Error',
        reconnect: mockReconnect,
      });

      render(<ConnectionIndicator />);
      const btn = screen.getByTestId('connection-indicator-disconnected');
      expect(btn).toBeInTheDocument();
      expect(screen.getByText('Offline (Retry)')).toBeInTheDocument();

      fireEvent.click(btn);
      expect(mockReconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('useSocketEvent Hook', () => {
    it('subscribes to socket event and unsubscribes cleanly on unmount', () => {
      const mockOn = vi.fn();
      const mockOff = vi.fn();
      const mockSocket = { on: mockOn, off: mockOff };

      vi.spyOn(SocketContextModule, 'useSocketContext').mockReturnValue({
        socket: mockSocket,
        isConnected: true,
      });

      const handler = vi.fn();
      const { unmount } = renderHook(() =>
        useSocketModule.useSocketEvent('incident:updated', handler)
      );

      expect(mockOn).toHaveBeenCalledWith('incident:updated', expect.any(Function));

      unmount();
      expect(mockOff).toHaveBeenCalledWith('incident:updated', expect.any(Function));
    });
  });

  describe('useIncidentRoom Hook', () => {
    it('emits incident:join on mount and incident:leave on unmount', () => {
      const mockEmit = vi.fn();
      const mockSocket = { emit: mockEmit };

      vi.spyOn(SocketContextModule, 'useSocketContext').mockReturnValue({
        socket: mockSocket,
        isConnected: true,
        reconnectCount: 0,
      });

      const { unmount } = renderHook(() =>
        useSocketModule.useIncidentRoom('inc-123')
      );

      expect(mockEmit).toHaveBeenCalledWith('incident:join', { incidentId: 'inc-123' });

      unmount();
      expect(mockEmit).toHaveBeenCalledWith('incident:leave', { incidentId: 'inc-123' });
    });
  });

  describe('SocketProvider Lifecycle', () => {
    it('connects socket when user is authenticated and disconnects when unauthenticated', () => {
      const useAuthSpy = vi.spyOn(AuthContextModule, 'useAuth');

      // 1. Authenticated
      useAuthSpy.mockReturnValue({
        user: { _id: 'u1', role: 'USER' },
        isAuthenticated: true,
      });

      const { unmount, rerender } = render(
        <SocketContextModule.SocketProvider>
          <div>App Child</div>
        </SocketContextModule.SocketProvider>
      );

      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ withCredentials: true })
      );

      // 2. Unauthenticated
      useAuthSpy.mockReturnValue({
        user: null,
        isAuthenticated: false,
      });

      rerender(
        <SocketContextModule.SocketProvider>
          <div>App Child</div>
        </SocketContextModule.SocketProvider>
      );

      unmount();
    });
  });
});
