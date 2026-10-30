import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { toLatLng, formatCoords } from '../../utils/geo.js';
import { createIncidentIcon, createResponderIcon } from './mapIcons.js';
import { useSocketEvent } from '../../hooks/useSocket.js';
import { Link } from 'react-router-dom';
import SeverityBadge from '../common/SeverityBadge.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import { Shield, MapPin, Radio, Layers } from 'lucide-react';

const AdminMapBounds = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);

  return null;
};

/**
 * Admin Live Map:
 * Displays all active incidents and online first responders with live real-time updates.
 */
export const AdminLiveMap = ({
  incidents = [],
  responders = [],
  height = '420px',
  className = '',
}) => {
  const defaultCenter = [19.0760, 72.8777];

  const [liveIncidents, setLiveIncidents] = useState(incidents);
  const [liveResponders, setLiveResponders] = useState(responders);

  // Sync external incidents prop
  useEffect(() => {
    setLiveIncidents(incidents);
  }, [incidents]);

  // Sync external responders prop
  useEffect(() => {
    setLiveResponders(responders);
  }, [responders]);

  // Real-time: new incident reported
  useSocketEvent('incident:new', (payload) => {
    setLiveIncidents((prev) => {
      const id = payload.incidentId || payload.id || payload._id;
      if (prev.some((item) => (item._id || item.incidentId) === id)) return prev;
      return [payload, ...prev];
    });
  });

  // Real-time: incident updated or resolved
  useSocketEvent('incident:updated', (payload) => {
    setLiveIncidents((prev) => {
      if (['RESOLVED', 'CANCELLED', 'REJECTED'].includes(payload.status)) {
        return prev.filter((item) => (item._id || item.incidentId) !== payload.incidentId);
      }
      return prev.map((item) =>
        (item._id || item.incidentId) === payload.incidentId
          ? { ...item, status: payload.status, severity: payload.severity || item.severity }
          : item
      );
    });
  });

  // Real-time: responder live location update
  useSocketEvent('responder:location', (payload) => {
    if (!payload?.lat || !payload?.lng) return;
    setLiveResponders((prev) => {
      const exists = prev.some((r) => r._id === payload.responderId);
      if (exists) {
        return prev.map((r) =>
          r._id === payload.responderId
            ? { ...r, currentLocation: { coordinates: [payload.lng, payload.lat] } }
            : r
        );
      }
      return prev;
    });
  });

  // Collect all mapped points for bounds
  const mappedIncidentPoints = liveIncidents
    .map((inc) => ({
      incident: inc,
      latLng: toLatLng(inc.location || inc.approximateLocation),
    }))
    .filter((item) => item.latLng !== null);

  const mappedResponderPoints = liveResponders
    .map((resp) => ({
      responder: resp,
      latLng: toLatLng(resp.responderProfile?.currentLocation || resp.currentLocation),
    }))
    .filter((item) => item.latLng !== null);

  const allPoints = [
    ...mappedIncidentPoints.map((item) => item.latLng),
    ...mappedResponderPoints.map((item) => item.latLng),
  ];

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm z-0 ${className}`}
      style={{ height }}
      data-testid="admin-live-map"
    >
      <MapContainer
        center={allPoints[0] || defaultCenter}
        zoom={12}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <AdminMapBounds points={allPoints} />

        {/* 1. Incident Markers */}
        {mappedIncidentPoints.map(({ incident, latLng }, idx) => (
          <Marker
            key={incident._id || incident.incidentId || idx}
            position={latLng}
            icon={createIncidentIcon(incident.severity, incident.severity === 'CRITICAL')}
          >
            <Popup className="admin-map-popup">
              <div className="p-1 min-w-[180px] space-y-1.5">
                <div className="flex items-center justify-between gap-1.5 border-b border-gray-100 pb-1">
                  <span className="font-mono text-xs font-bold text-primary">
                    {incident.incidentNumber}
                  </span>
                  <SeverityBadge severity={incident.severity} size="xs" />
                </div>
                <div className="text-xs font-semibold text-appText-primary">
                  {incident.category} {incident.isSOS && '(SOS)'}
                </div>
                <div className="text-[11px] text-appText-secondary line-clamp-2">
                  {incident.address || formatCoords(latLng)}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <StatusBadge status={incident.status} size="xs" />
                  <Link
                    to={`/admin/incidents?search=${incident.incidentNumber}`}
                    className="text-[11px] font-bold text-primary hover:underline"
                  >
                    Manage &rarr;
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 2. Online Responder Markers */}
        {mappedResponderPoints.map(({ responder, latLng }, idx) => (
          <Marker key={responder._id || idx} position={latLng} icon={createResponderIcon()}>
            <Popup className="admin-responder-popup">
              <div className="p-1 min-w-[140px] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700 border-b border-gray-100 pb-1">
                  <Shield className="w-3.5 h-3.5 text-teal-600" />
                  <span>{responder.name}</span>
                </div>
                <div className="text-[11px] text-teal-800 font-medium">
                  Status: Available Online
                </div>
                <div className="text-[10px] font-mono text-appText-muted">
                  {formatCoords(latLng)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Floating Tactical Overlay Controls */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3 text-xs font-semibold text-appText-primary">
        <div className="flex items-center gap-1.5 text-emergency">
          <span className="w-2.5 h-2.5 rounded-full bg-emergency animate-pulse" />
          <span>{mappedIncidentPoints.length} Emergencies</span>
        </div>
        <div className="w-px h-3.5 bg-gray-300" />
        <div className="flex items-center gap-1.5 text-teal-700">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
          <span>{mappedResponderPoints.length} Responders</span>
        </div>
      </div>
    </div>
  );
};

export default AdminLiveMap;
