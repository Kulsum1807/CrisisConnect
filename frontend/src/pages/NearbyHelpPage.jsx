import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import useGeolocation from '../hooks/useGeolocation.js';
import useNearbyPlaces from '../hooks/useNearbyPlaces.js';
import NearbyHelpList from '../components/places/NearbyHelpList.jsx';
import {
  createHospitalIcon,
  createPoliceIcon,
  createUserIcon,
} from '../components/map/mapIcons.js';
import { toLatLng, formatCoords } from '../utils/geo.js';
import Button from '../components/common/Button.jsx';
import {
  Building2,
  Shield,
  LocateFixed,
  RefreshCw,
  ExternalLink,
  PhoneCall,
  MapPin,
} from 'lucide-react';

// Default center: Bangalore, India
const DEFAULT_CENTER = [12.9716, 77.5946];

export const NearbyHelpPage = () => {
  const { coords, loading: geoLoading, detectLocation } = useGeolocation({
    enableHighAccuracy: true,
  });

  const [activeCenter, setActiveCenter] = useState(null);
  const [radius, setRadius] = useState(5000);
  const [type, setType] = useState('all');

  // Center on detected location or default
  const centerLatLng = activeCenter || toLatLng(coords) || DEFAULT_CENTER;

  const { places, loading, error, refetch } = useNearbyPlaces({
    lat: centerLatLng[0],
    lng: centerLatLng[1],
    radius,
    type,
    enabled: true,
  });

  const handleUseCurrentLocation = async () => {
    const fresh = await detectLocation();
    if (fresh) {
      setActiveCenter(toLatLng(fresh));
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-12">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <Building2 className="w-4 h-4 text-red-600" />
          <Shield className="w-4 h-4 text-blue-600" />
          <span>Emergency Services Directory</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-appText-primary font-display mt-1">
          Nearby Help
        </h1>
        <p className="text-xs sm:text-sm text-appText-secondary mt-1">
          Find hospitals, emergency medical centers, and police stations near your current location.
        </p>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Type Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-appText-secondary">Facility:</span>
          {[
            { id: 'all', label: 'All Services' },
            { id: 'hospital', label: 'Hospitals Only' },
            { id: 'police', label: 'Police Only' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setType(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                type === item.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-100 hover:bg-gray-200 text-appText-secondary'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Radius Filter & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-appText-secondary">Radius:</span>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="px-2.5 py-1.5 bg-surface border border-gray-300 rounded-lg text-xs font-semibold text-appText-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={2000}>2 km</option>
              <option value={5000}>5 km</option>
              <option value={10000}>10 km</option>
            </select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUseCurrentLocation}
            loading={geoLoading}
            className="text-xs"
          >
            <LocateFixed className="w-3.5 h-3.5 mr-1 text-primary" />
            My GPS
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={refetch}
            disabled={loading}
            className="text-xs"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Interactive Map */}
      <div
        className="w-full h-[380px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative z-0"
        data-testid="nearby-help-map"
      >
        <MapContainer
          center={centerLatLng}
          zoom={13}
          scrollWheelZoom={false}
          className="w-full h-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* User Center Pin */}
          <Marker position={centerLatLng} icon={createUserIcon()}>
            <Popup>
              <div className="p-1 text-xs">
                <span className="font-bold text-primary flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emergency" /> Search Center
                </span>
                <span className="font-mono text-[10px] text-appText-muted block mt-0.5">
                  {formatCoords(centerLatLng)}
                </span>
              </div>
            </Popup>
          </Marker>

          {/* Nearby Hospital and Police Markers */}
          {places.map((place) => (
            <Marker
              key={place.id}
              position={[place.lat, place.lng]}
              icon={place.type === 'hospital' ? createHospitalIcon() : createPoliceIcon()}
            >
              <Popup>
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
      </div>

      {/* Facilities List */}
      <div className="bg-surface p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-base font-bold text-appText-primary font-display flex items-center gap-2">
            Discovered Facilities
            {!loading && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold font-mono">
                {places.length}
              </span>
            )}
          </h2>
          <span className="text-xs text-appText-secondary">Sorted by distance</span>
        </div>

        <NearbyHelpList places={places} loading={loading} error={error} />
      </div>
    </div>
  );
};

export default NearbyHelpPage;
