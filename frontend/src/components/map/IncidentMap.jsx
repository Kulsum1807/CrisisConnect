import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { toLatLng, formatCoords, calculateDistanceKm } from '../../utils/geo.js';
import {
  createIncidentIcon,
  createResponderIcon,
  createUserIcon,
  createHospitalIcon,
  createPoliceIcon,
} from './mapIcons.js';
import SeverityBadge from '../common/SeverityBadge.jsx';
import NearbyHelpList from '../places/NearbyHelpList.jsx';
import useNearbyPlaces from '../../hooks/useNearbyPlaces.js';
import {
  MapPin,
  Navigation,
  Shield,
  User,
  Building2,
  ExternalLink,
  PhoneCall,
} from 'lucide-react';

/**
 * Helper component that dynamically bounds the Leaflet viewport around all active markers.
 */
const MapBoundsController = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 16,
      animate: true,
    });
  }, [map, points]);

  return null;
};

/**
 * Interactive emergency incident map with severity-coloured markers, live responder tracking,
 * and nearby help (hospitals and police stations) toggle.
 */
export const IncidentMap = ({
  incidentLocation,
  severity = 'HIGH',
  category = 'EMERGENCY',
  incidentNumber = '',
  address = '',
  responderLocation = null,
  responderName = 'Responder',
  userLocation = null,
  height = '350px',
  className = '',
  enableNearbyHelp = true,
}) => {
  const incidentLatLng = toLatLng(incidentLocation);
  const responderLatLng = toLatLng(responderLocation);
  const userLatLng = toLatLng(userLocation);

  const [showNearbyHelp, setShowNearbyHelp] = useState(false);
  const [nearbyType, setNearbyType] = useState('all');

  // Fetch nearby places when enabled
  const { places, loading: nearbyLoading, error: nearbyError } = useNearbyPlaces({
    lat: incidentLatLng ? incidentLatLng[0] : null,
    lng: incidentLatLng ? incidentLatLng[1] : null,
    radius: 5000,
    type: nearbyType,
    enabled: showNearbyHelp && !!incidentLatLng,
  });

  // Fallback if no valid incident coordinates exist
  if (!incidentLatLng) {
    return (
      <div
        className={`w-full rounded-2xl bg-surface border border-gray-200 flex flex-col items-center justify-center p-6 text-center text-appText-secondary ${className}`}
        style={{ height }}
        data-testid="map-fallback"
      >
        <MapPin className="w-8 h-8 text-appText-muted mb-2 animate-bounce" />
        <p className="text-sm font-semibold text-appText-primary">Coordinates Unavailable</p>
        <p className="text-xs text-appText-secondary max-w-xs mt-1">
          {address ? `Address: ${address}` : 'GPS coordinates were not provided for this incident.'}
        </p>
      </div>
    );
  }

  // Collect all valid points for bounds calculation
  const activePoints = [incidentLatLng];
  if (responderLatLng) activePoints.push(responderLatLng);
  if (userLatLng) activePoints.push(userLatLng);

  const distanceKm = responderLatLng
    ? calculateDistanceKm(incidentLatLng, responderLatLng)
    : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Map Container */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm z-0 ${className}`}
        style={{ height }}
        data-testid="incident-map"
      >
        <MapContainer
          center={incidentLatLng}
          zoom={14}
          scrollWheelZoom={false}
          className="w-full h-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <MapBoundsController points={activePoints} />

          {/* 1. Incident Location Marker */}
          <Marker
            position={incidentLatLng}
            icon={createIncidentIcon(severity, severity === 'CRITICAL')}
          >
            <Popup className="incident-popup">
              <div className="p-1 min-w-[160px] space-y-1.5">
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-1">
                  <span className="font-mono text-xs font-extrabold text-primary">
                    {incidentNumber || 'Incident'}
                  </span>
                  <SeverityBadge severity={severity} size="xs" />
                </div>
                <div className="text-xs font-semibold text-appText-primary">
                  {category} Emergency
                </div>
                {address && (
                  <div className="text-[11px] text-appText-secondary line-clamp-2">
                    {address}
                  </div>
                )}
                <div className="text-[10px] font-mono text-appText-muted">
                  {formatCoords(incidentLatLng)}
                </div>
              </div>
            </Popup>
          </Marker>

          {/* 2. Live Responder Marker (if actively sharing and assigned) */}
          {responderLatLng && (
            <Marker position={responderLatLng} icon={createResponderIcon()}>
              <Popup className="responder-popup">
                <div className="p-1 min-w-[150px] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700 border-b border-gray-100 pb-1">
                    <Shield className="w-3.5 h-3.5 text-teal-600" />
                    <span>{responderName}</span>
                  </div>
                  <div className="text-[11px] text-teal-800 font-medium">
                    {distanceKm !== null ? `Distance: ~${distanceKm} km away` : 'Live location active'}
                  </div>
                  <div className="text-[10px] font-mono text-appText-muted">
                    {formatCoords(responderLatLng)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* 3. User Marker (if different from incident coordinates) */}
          {userLatLng && (
            <Marker position={userLatLng} icon={createUserIcon()}>
              <Popup>
                <div className="text-xs font-medium text-blue-700">Reporting Citizen</div>
              </Popup>
            </Marker>
          )}

          {/* 4. Nearby Hospitals and Police Station Markers */}
          {showNearbyHelp &&
            places.map((place) => (
              <Marker
                key={place.id}
                position={[place.lat, place.lng]}
                icon={place.type === 'hospital' ? createHospitalIcon() : createPoliceIcon()}
              >
                <Popup className="nearby-place-popup">
                  <div className="p-1 min-w-[170px] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-1 border-b border-gray-100 pb-1">
                      {place.type === 'hospital' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700">
                          <Building2 className="w-3.5 h-3.5" /> Hospital
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800">
                          <Shield className="w-3.5 h-3.5" /> Police Station
                        </span>
                      )}
                      <span className="text-[10px] text-appText-secondary">
                        {(place.distanceMeters / 1000).toFixed(1)} km
                      </span>
                    </div>

                    <h5 className="font-bold text-appText-primary">{place.name}</h5>

                    <div className="flex items-center gap-1.5 pt-1">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
                      >
                        <ExternalLink className="w-3 h-3" /> Directions
                      </a>
                      {place.phone && (
                        <a
                          href={`tel:${place.phone}`}
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline font-bold ml-auto"
                        >
                          <PhoneCall className="w-3 h-3" /> Call
                        </a>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>

        {/* Floating Status Badge on Map */}
        <div className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-200/80 shadow-sm flex items-center gap-2 text-xs font-semibold text-appText-primary">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>
            {responderLatLng
              ? distanceKm !== null
                ? `Responder ~${distanceKm} km away`
                : 'Responder Live'
              : 'Incident Mapped'}
          </span>
        </div>
      </div>

      {/* Nearby Help Control Bar & List */}
      {enableNearbyHelp && (
        <div className="bg-surface p-4 rounded-xl border border-gray-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowNearbyHelp((prev) => !prev)}
                className={`touch-target inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                  showNearbyHelp
                    ? 'bg-primary text-white hover:bg-primary-hover ring-2 ring-primary/30'
                    : 'bg-gray-100 hover:bg-gray-200 text-appText-primary'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-red-600" />
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span>{showNearbyHelp ? 'Hide Nearby Help' : 'Show Nearby Help'}</span>
              </button>

              <span className="text-xs text-appText-secondary hidden sm:inline">
                Find hospitals & police stations near this incident
              </span>
            </div>

            {showNearbyHelp && (
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <span className="text-[11px] text-appText-secondary mr-1 font-semibold">Filter:</span>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'hospital', label: 'Hospitals' },
                  { id: 'police', label: 'Police' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setNearbyType(f.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                      nearbyType === f.id
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-appText-secondary'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List View under the map */}
          {showNearbyHelp && (
            <div className="pt-2 border-t border-gray-100">
              <NearbyHelpList
                places={places}
                loading={nearbyLoading}
                error={nearbyError}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IncidentMap;

