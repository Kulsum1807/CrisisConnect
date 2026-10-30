import { useEffect, useRef } from 'react';
import { useSocketContext } from '../context/SocketContext.jsx';

export { useSocketContext };

/**
 * Access the core socket connection and state.
 */
export const useSocket = () => {
  return useSocketContext();
};

/**
 * Hook to subscribe to a Socket.IO event with automatic teardown on unmount.
 *
 * @param {string} event - The socket event name (e.g. 'incident:updated', 'notification:new')
 * @param {Function} handler - Callback to execute on event receive
 */
export const useSocketEvent = (event, handler) => {
  const { socket, isConnected } = useSocketContext();
  const handlerRef = useRef(handler);

  // Keep latest handler in a ref so consumers do not need to wrap everything in useCallback
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket || !event) return;

    const eventListener = (...args) => {
      if (handlerRef.current) {
        handlerRef.current(...args);
      }
    };

    socket.on(event, eventListener);

    return () => {
      socket.off(event, eventListener);
    };
  }, [socket, event, isConnected]);
};

/**
 * Hook to automatically join and leave an incident socket room.
 * Re-joins automatically if the socket reconnects.
 *
 * @param {string|null} incidentId
 */
export const useIncidentRoom = (incidentId) => {
  const { socket, isConnected, reconnectCount } = useSocketContext();

  useEffect(() => {
    if (!socket || !isConnected || !incidentId) return;

    // Join room
    socket.emit('incident:join', { incidentId });

    return () => {
      // Leave room on unmount or incident change
      socket.emit('incident:leave', { incidentId });
    };
  }, [socket, isConnected, incidentId, reconnectCount]);
};

export default useSocket;
