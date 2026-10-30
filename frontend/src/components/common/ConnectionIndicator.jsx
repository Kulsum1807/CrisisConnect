import React from 'react';
import { useSocket } from '../../hooks/useSocket.js';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

/**
 * Visual WebSocket Connection Indicator
 * Shows live sync status with reconnect capability.
 */
export const ConnectionIndicator = ({ compact = false, className = '' }) => {
  const { isConnected, isConnecting, connectionError, reconnect } = useSocket();

  if (isConnected) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 transition-all ${className}`}
        title="Real-time live sync connected"
        data-testid="connection-indicator-connected"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        {!compact && <span>Live</span>}
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 transition-all ${className}`}
        title="Connecting to real-time sync server..."
        data-testid="connection-indicator-connecting"
      >
        <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
        {!compact && <span>Syncing...</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={reconnect}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer transition-all ${className}`}
      title={connectionError ? `Disconnected: ${connectionError}. Click to reconnect.` : 'Disconnected. Click to reconnect.'}
      data-testid="connection-indicator-disconnected"
    >
      <span className="inline-flex rounded-full h-2 w-2 bg-rose-500" />
      {!compact && <span>Offline (Retry)</span>}
    </button>
  );
};

export default ConnectionIndicator;
