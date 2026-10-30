import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext({
  socket: null,
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  reconnect: () => {},
  reconnectCount: 0,
});

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  const socketRef = useRef(null);

  // Derive Socket server URL from environment or default to backend port
  const socketUrl =
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') ||
    'http://localhost:5000';

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionError(null);
  }, []);

  const connectSocket = useCallback(() => {
    if (!isAuthenticated || !user) {
      disconnectSocket();
      return;
    }

    // Reuse existing active socket if already connected or connecting
    if (socketRef.current && (socketRef.current.connected || socketRef.current.connecting)) {
      return;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    setIsConnecting(true);
    setConnectionError(null);

    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      setIsConnecting(false);
      if (reason === 'io server disconnect') {
        // Server forced disconnect (e.g. auth expired)
        socket.connect();
      }
    });

    socket.on('connect_error', (err) => {
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionError(err.message || 'Connection failed');
    });

    socket.io.on('reconnect', (attempt) => {
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
      setReconnectCount((prev) => prev + 1);
    });

    socket.on('error:event', (errData) => {
      console.warn('[Socket Event Error]', errData);
    });
  }, [isAuthenticated, user, socketUrl, disconnectSocket]);

  useEffect(() => {
    if (isAuthenticated && user) {
      connectSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user, connectSocket, disconnectSocket]);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect();
    } else {
      connectSocket();
    }
  }, [connectSocket]);

  const value = {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    connectionError,
    reconnect,
    reconnectCount,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocketContext = () => useContext(SocketContext);

export default SocketContext;
