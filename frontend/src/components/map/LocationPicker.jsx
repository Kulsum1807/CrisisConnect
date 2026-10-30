import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { toLatLng, formatCoords, isValidCoordinate } from '../../utils/geo.js';
import { createPickerIcon } from './mapIcons.js';
import useGeolocation from '../../hooks/useGeolocation.js';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import { MapPin, Navigation, Compass, AlertCircle } from 'lucide-react';

/**
 * Map click handler that repositions the picker marker.
 */
const LocationClickHandler = ({ onLocationPick }) => {
  useMapEvents({
    click(e) {
      onLocationPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

/**
 * Controller to smoothly center the map on coordinate updates.
 */
const MapCenterController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && isValidCoordinate(center[0], center[1])) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
};

/**
 * Interactive LocationPicker Component.
 * Supports map click/drag positioning, GPS auto-detect via useGeolocation, and manual address text fallback.
 */
export const LocationPicker = ({
  value = null, // { lat, lng } or [lat, lng]
  address = '',
  onChange,
  onAddressChange,
  height = '280px',
  className = '',
}) => {
  // Default coordinates (e.g., Mumbai center if no user location yet)
  const defaultCenter = [19.0760, 72.8777];

  const initialLatLng = toLatLng(value) || defaultCenter;
  const [selectedCoords, setSelectedCoords] = useState(initialLatLng);
  const [isLocating, setIsLocating] = useState(false);
  const [manualAddress, setManualAddress] = useState(address || '');

  const { getCurrentLocation, permission } = useGeolocation();

  // Sync external address changes
  useEffect(() => {
    if (address !== undefined) {
      setManualAddress(address);
    }
  }, [address]);

  // Sync external value changes
  useEffect(() => {
    const latLng = toLatLng(value);
    if (latLng) {
      setSelectedCoords(latLng);
    }
  }, [value]);

  const handleCoordsChange = (newCoords) => {
    setSelectedCoords(newCoords);
    if (onChange) {
      onChange({
        lat: newCoords[0],
        lng: newCoords[1],
        address: manualAddress,
        locationAvailable: true,
      });
    }
  };

  const handleAddressInputChange = (e) => {
    const val = e.target.value;
    setManualAddress(val);
    if (onAddressChange) {
      onAddressChange(val);
    }
    if (onChange) {
      onChange({
        lat: selectedCoords ? selectedCoords[0] : null,
        lng: selectedCoords ? selectedCoords[1] : null,
        address: val,
        locationAvailable: Boolean(selectedCoords),
      });
    }
  };

  const handleDetectGPS = async () => {
    setIsLocating(true);
    const result = await getCurrentLocation({ enableHighAccuracy: true });
    setIsLocating(false);

    if (result) {
      const newPoint = [result.lat, result.lng];
      handleCoordsChange(newPoint);
    }
  };

  // Draggable marker event handlers
  const markerEventHandlers = useMemo(
    () => ({
      dragend(e) {
        const marker = e.target;
        const position = marker.getLatLng();
        handleCoordsChange([position.lat, position.lng]);
      },
    }),
    []
  );

  return (
    <div className={`flex flex-col gap-3 ${className}`} data-testid="location-picker">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-appText-secondary">
          <Compass className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium">
            {selectedCoords ? formatCoords(selectedCoords) : 'Pinpoint incident location'}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDetectGPS}
          loading={isLocating}
          className="text-xs self-start sm:self-auto"
          aria-label="Use Current GPS Location"
        >
          <Navigation className="w-3.5 h-3.5 mr-1 text-primary" />
          Use My Current Location
        </Button>
      </div>

      {/* Permission alert if denied */}
      {permission === 'denied' && (
        <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Location access was denied. You can click on the map or type your address below.</span>
        </div>
      )}

      {/* Map Canvas */}
      <div
        className="relative w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm z-0"
        style={{ height }}
      >
        <MapContainer
          center={selectedCoords || defaultCenter}
          zoom={13}
          scrollWheelZoom={false}
          className="w-full h-full z-0 cursor-crosshair"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <MapCenterController center={selectedCoords} />
          <LocationClickHandler onLocationPick={handleCoordsChange} />

          {selectedCoords && (
            <Marker
              position={selectedCoords}
              icon={createPickerIcon()}
              draggable={true}
              eventHandlers={markerEventHandlers}
            />
          )}
        </MapContainer>

        <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-medium text-appText-secondary border border-gray-200/80 shadow-sm pointer-events-none">
          Click map or drag pin to position
        </div>
      </div>

      {/* Manual Address Fallback Input */}
      <div>
        <label className="block text-xs font-semibold text-appText-primary mb-1">
          Address / Landmark Details (Required if GPS unavailable)
        </label>
        <Input
          placeholder="e.g. Near City Hospital Gate 2, Main Street, Floor 3"
          value={manualAddress}
          onChange={handleAddressInputChange}
          maxLength={300}
        />
        <p className="text-[11px] text-appText-muted mt-1">
          Provide landmark, building name, or specific floor details for first responders.
        </p>
      </div>
    </div>
  );
};

export default LocationPicker;
