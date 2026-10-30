import React from 'react';
import {
  Building2,
  Shield,
  Navigation,
  PhoneCall,
  ExternalLink,
  AlertTriangle,
  Info,
  Phone,
} from 'lucide-react';
import Button from '../common/Button.jsx';

/**
 * Renders an accessible list of nearby hospitals and police stations.
 * Adheres to accessibility requirements: icon + text label carry meaning, not color alone.
 */
export const NearbyHelpList = ({
  places = [],
  loading = false,
  error = null,
  onSelectPlace = null,
}) => {
  return (
    <div className="flex flex-col gap-4 text-appText-primary">
      {/* 1. Urgent Emergency Notice & Call 112 CTA */}
      <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-900 block sm:inline mr-1">
              Information only.
            </span>
            <span className="text-amber-800">
              In a real emergency call 112 immediately.
            </span>
          </div>
        </div>

        <a
          href="tel:112"
          className="touch-target inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emergency hover:bg-emergency-hover text-white rounded-lg text-xs font-bold transition-colors shadow-sm self-start sm:self-auto"
        >
          <Phone className="w-3.5 h-3.5" />
          Call 112
        </a>
      </div>

      {/* 2. Error State */}
      {error && (
        <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800 flex items-start gap-2">
          <Info className="w-4 h-4 text-emergency flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
            <p className="text-[11px] text-red-700 mt-0.5">
              Please dial emergency dispatch 112 if immediate assistance is required.
            </p>
          </div>
        </div>
      )}

      {/* 3. Loading State */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 bg-gray-50 rounded-xl border border-gray-200 animate-pulse space-y-2.5"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-6 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* 4. Empty State */}
      {!loading && !error && places.length === 0 && (
        <div className="p-6 bg-surface rounded-xl border border-gray-200 text-center text-xs text-appText-secondary space-y-2">
          <Building2 className="w-8 h-8 text-appText-muted mx-auto" />
          <p className="font-semibold text-appText-primary">No nearby facilities found</p>
          <p className="text-[11px] max-w-sm mx-auto">
            No hospitals or police stations were found within this search radius. In an emergency, dial 112 for state dispatch.
          </p>
        </div>
      )}

      {/* 5. Places List */}
      {!loading && places.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="nearby-places-list">
          {places.map((place) => {
            const isHospital = place.type === 'hospital';
            const distanceKm =
              typeof place.distanceMeters === 'number'
                ? (place.distanceMeters / 1000).toFixed(1)
                : null;

            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;

            return (
              <div
                key={place.id}
                className="p-3.5 bg-surface rounded-xl border border-gray-200 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between gap-3 text-xs"
              >
                <div>
                  {/* Type Badge with Icon + Explicit Text Label */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    {isHospital ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                        <Building2 className="w-3.5 h-3.5 text-red-600" />
                        <span>Hospital</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        <Shield className="w-3.5 h-3.5 text-blue-600" />
                        <span>Police Station</span>
                      </span>
                    )}

                    {distanceKm !== null && (
                      <span className="font-semibold text-appText-secondary text-[11px] flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-primary" />
                        {distanceKm} km
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <h4 className="font-bold text-sm text-appText-primary line-clamp-1">
                    {place.name}
                  </h4>
                </div>

                {/* Actions: Directions and Call */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-appText-primary text-xs font-semibold transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Directions</span>
                  </a>

                  {place.phone ? (
                    <a
                      href={`tel:${place.phone}`}
                      className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Call</span>
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Attribution Note */}
      <div className="text-[11px] text-appText-muted text-center pt-2 border-t border-gray-100">
        Facility data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">OpenStreetMap contributors</a> via Overpass API.
      </div>
    </div>
  );
};

export default NearbyHelpList;
