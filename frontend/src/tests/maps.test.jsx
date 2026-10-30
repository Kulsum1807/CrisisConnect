import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  toLatLng,
  toGeoJSONPoint,
  isValidCoordinate,
  formatCoords,
  calculateDistanceKm,
} from '../utils/geo.js';
import IncidentMap from '../components/map/IncidentMap.jsx';
import LocationPicker from '../components/map/LocationPicker.jsx';
import useGeolocation from '../hooks/useGeolocation.js';
import useResponderLocation from '../hooks/useResponderLocation.js';
import * as SocketContextModule from '../context/SocketContext.jsx';

// Mock Leaflet and React-Leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, center, scrollWheelZoom, ...props }) => (
    <div data-testid="map-container" data-center={JSON.stringify(center)} {...props}>
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children, position, icon, draggable, eventHandlers, ...props }) => (
    <div data-testid="map-marker" data-position={JSON.stringify(position)} {...props}>
      {children}
    </div>
  ),
  Popup: ({ children }) => <div data-testid="map-popup">{children}</div>,
  useMap: () => ({
    setView: vi.fn(),
    fitBounds: vi.fn(),
    getZoom: vi.fn(() => 14),
  }),
  useMapEvents: (handlers) => handlers,
}));

vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn((opts) => ({ ...opts, _isDivIcon: true })),
    latLngBounds: vi.fn(() => ({
      extend: vi.fn(),
    })),
  },
  divIcon: vi.fn((opts) => ({ ...opts, _isDivIcon: true })),
  latLngBounds: vi.fn(() => ({
    extend: vi.fn(),
  })),
}));

describe('Phase 9 Frontend: Maps and Location Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // 1. Coordinate Utilities
  // ==========================================
  describe('1. Coordinate Utilities (geo.js)', () => {
    it('converts diverse coordinate formats into Leaflet [lat, lng]', () => {
      // Object format
      expect(toLatLng({ lat: 19.0760, lng: 72.8777 })).toEqual([19.0760, 72.8777]);
      expect(toLatLng({ latitude: 19.0760, longitude: 72.8777 })).toEqual([19.0760, 72.8777]);

      // GeoJSON array [lng, lat]
      expect(toLatLng([72.8777, 19.0760])).toEqual([19.0760, 72.8777]);

      // GeoJSON geometry object
      expect(toLatLng({ coordinates: [72.8777, 19.0760] })).toEqual([19.0760, 72.8777]);

      // Null / invalid
      expect(toLatLng(null)).toBeNull();
      expect(toLatLng('invalid')).toBeNull();
    });

    it('converts client format to GeoJSON [lng, lat]', () => {
      expect(toGeoJSONPoint({ lat: 19.0760, lng: 72.8777 })).toEqual([72.8777, 19.0760]);
    });

    it('validates coordinate boundaries correctly', () => {
      expect(isValidCoordinate(19.0760, 72.8777)).toBe(true);
      expect(isValidCoordinate(90, 180)).toBe(true);
      expect(isValidCoordinate(-90, -180)).toBe(true);
      expect(isValidCoordinate(91, 50)).toBe(false);
      expect(isValidCoordinate(50, -181)).toBe(false);
      expect(isValidCoordinate('invalid', 50)).toBe(false);
    });

    it('formats coordinates for clean display', () => {
      const formatted = formatCoords([72.8777, 19.0760]);
      expect(formatted).toContain('19.0760° N');
      expect(formatted).toContain('72.8777° E');
    });

    it('calculates Haversine distance in kilometers accurately', () => {
      // Distance between Gateway of India and CST Mumbai (~2 km)
      const dist = calculateDistanceKm([72.8347, 18.9220], [72.8358, 18.9400]);
      expect(dist).toBeGreaterThan(1.8);
      expect(dist).toBeLessThan(2.2);
    });
  });

  // ==========================================
  // 2. useGeolocation Hook
  // ==========================================
  describe('2. useGeolocation Hook', () => {
    it('handles successful geolocation acquisition', async () => {
      const mockPosition = {
        coords: {
          latitude: 19.0760,
          longitude: 72.8777,
          accuracy: 10,
        },
      };

      global.navigator.geolocation = {
        getCurrentPosition: vi.fn((success) => success(mockPosition)),
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      };

      const { result } = renderHook(() => useGeolocation());

      let coords;
      await act(async () => {
        coords = await result.current.getCurrentLocation();
      });

      expect(coords).toEqual({
        lat: 19.0760,
        lng: 72.8777,
        accuracy: 10,
      });
      expect(result.current.permission).toBe('granted');
    });

    it('handles location denial gracefully without throwing exceptions', async () => {
      const mockError = { code: 1, message: 'User denied Geolocation' };

      global.navigator.geolocation = {
        getCurrentPosition: vi.fn((success, error) => error(mockError)),
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      };

      const { result } = renderHook(() => useGeolocation());

      let coords;
      await act(async () => {
        coords = await result.current.getCurrentLocation();
      });

      expect(coords).toBeNull();
      expect(result.current.permission).toBe('denied');
      expect(result.current.error).toContain('Location permission denied');
    });
  });

  // ==========================================
  // 3. IncidentMap Component
  // ==========================================
  describe('3. IncidentMap Component', () => {
    it('renders fallback when no valid coordinates are provided', () => {
      render(
        <IncidentMap
          incidentLocation={null}
          address="Sector 18 Market"
        />
      );

      expect(screen.getByTestId('map-fallback')).toBeInTheDocument();
      expect(screen.getByText('Coordinates Unavailable')).toBeInTheDocument();
      expect(screen.getByText(/Sector 18 Market/)).toBeInTheDocument();
    });

    it('renders interactive map with incident and live responder markers', () => {
      render(
        <IncidentMap
          incidentLocation={{ lat: 19.0760, lng: 72.8777 }}
          severity="CRITICAL"
          category="MEDICAL"
          incidentNumber="CC-1001"
          responderLocation={{ lat: 19.0780, lng: 72.8790 }}
          responderName="Officer Sharma"
        />
      );

      expect(screen.getByTestId('incident-map')).toBeInTheDocument();
      const markers = screen.getAllByTestId('map-marker');
      expect(markers.length).toBe(2); // 1 incident + 1 responder
    });
  });

  // ==========================================
  // 4. LocationPicker Component
  // ==========================================
  describe('4. LocationPicker Component', () => {
    it('renders location picker with address input and detects manual changes', () => {
      const handleLocationChange = vi.fn();
      const handleAddressChange = vi.fn();

      render(
        <LocationPicker
          value={{ lat: 19.0760, lng: 72.8777 }}
          address="Initial Address"
          onChange={handleLocationChange}
          onAddressChange={handleAddressChange}
        />
      );

      expect(screen.getByTestId('location-picker')).toBeInTheDocument();
      const addressInput = screen.getByPlaceholderText(/Near City Hospital/);
      expect(addressInput.value).toBe('Initial Address');

      // Change address
      fireEvent.change(addressInput, { target: { value: 'New Street Address 42' } });
      expect(handleAddressChange).toHaveBeenCalledWith('New Street Address 42');
    });
  });

  // ==========================================
  // 5. useResponderLocation Hook
  // ==========================================
  describe('5. useResponderLocation Hook', () => {
    it('emits responder:location via socket when incident is active', async () => {
      const mockEmit = vi.fn();
      const mockSocket = { emit: mockEmit };

      vi.spyOn(SocketContextModule, 'useSocketContext').mockReturnValue({
        socket: mockSocket,
        isConnected: true,
      });

      const mockPosition = {
        coords: { latitude: 19.0795, longitude: 72.8810 },
      };

      global.navigator.geolocation = {
        getCurrentPosition: vi.fn((success) => success(mockPosition)),
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      };

      renderHook(() =>
        useResponderLocation('inc-500', 'ACCEPTED')
      );

      expect(mockEmit).toHaveBeenCalledWith('responder:location', {
        incidentId: 'inc-500',
        lat: 19.0795,
        lng: 72.8810,
      });
    });

    it('does not emit location when incident status is terminal (RESOLVED)', () => {
      const mockEmit = vi.fn();
      const mockSocket = { emit: mockEmit };

      vi.spyOn(SocketContextModule, 'useSocketContext').mockReturnValue({
        socket: mockSocket,
        isConnected: true,
      });

      renderHook(() =>
        useResponderLocation('inc-500', 'RESOLVED')
      );

      expect(mockEmit).not.toHaveBeenCalled();
    });
  });
});
