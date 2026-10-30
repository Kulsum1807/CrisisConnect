import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import responderService from '../../services/responderService.js';
import { getErrorMessage } from '../../services/api.js';
import { VERIFICATION_STATUSES, AVAILABILITY } from '../../constants/responder.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { ShieldCheck, MapPin, Radio, AlertCircle } from 'lucide-react';

export const ResponderProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const profile = user?.responderProfile || {};
  const [coords, setCoords] = useState({
    lat: profile.currentLocation?.coordinates?.[1] || 28.6139,
    lng: profile.currentLocation?.coordinates?.[0] || 77.209,
  });
  const [gpsLoading, setGpsLoading] = useState(false);

  const handleUpdateGps = async (e) => {
    e.preventDefault();
    setGpsLoading(true);
    try {
      await responderService.updateLocation(Number(coords.lat), Number(coords.lng));
      await refreshUser();
      showToast('Live telemetry coordinates updated successfully', 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleAcquireDeviceGps = () => {
    if (!('geolocation' in navigator)) {
      showToast('Geolocation not supported by device', 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        showToast('Device GPS coordinates locked', 'success');
      },
      () => {
        showToast('Device GPS permission denied', 'error');
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-appText-primary font-display">
          Responder Operational Profile
        </h1>
        <p className="text-xs sm:text-sm text-appText-secondary mt-1">
          Review dispatch accreditation, active specializations, and GPS positioning.
        </p>
      </div>

      {/* Verification & Accreditation Card */}
      <div className="bg-surface p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-appText-secondary">
            Accreditation Status
          </span>
          <span
            className={`text-xs font-extrabold px-3 py-1 rounded-full ${
              profile.verificationStatus === VERIFICATION_STATUSES.VERIFIED
                ? 'bg-emerald-100 text-emerald-800'
                : profile.verificationStatus === VERIFICATION_STATUSES.REJECTED
                ? 'bg-red-100 text-red-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {profile.verificationStatus}
          </span>
        </div>

        <div>
          <h3 className="text-lg font-bold text-appText-primary">{user?.name}</h3>
          <p className="text-xs text-appText-secondary">{user?.email} • {user?.phone}</p>
        </div>

        {profile.specialization && profile.specialization.length > 0 && (
          <div>
            <span className="text-xs font-bold uppercase text-appText-secondary block mb-1.5">
              Registered Specializations
            </span>
            <div className="flex flex-wrap gap-1.5">
              {profile.specialization.map((spec) => (
                <span
                  key={spec}
                  className="px-2.5 py-1 rounded-md bg-gray-100 text-primary text-xs font-bold"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>
        )}

        {profile.verificationNote && (
          <div className="p-3 bg-gray-50 rounded-lg text-xs text-appText-secondary">
            <strong>Admin Note:</strong> {profile.verificationNote}
          </div>
        )}
      </div>

      {/* GPS Telemetry Simulation Card */}
      <div className="bg-surface p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <Radio className="w-4 h-4" />
            <span>GPS Location Telemetry</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleAcquireDeviceGps} className="text-xs">
            Acquire Current GPS
          </Button>
        </div>

        <p className="text-xs text-appText-secondary">
          Updates your location on the dispatch map for geospatial emergency matching ($near 2dsphere queries).
        </p>

        <form onSubmit={handleUpdateGps} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Input
            label="Latitude"
            type="number"
            step="any"
            value={coords.lat}
            onChange={(e) => setCoords((prev) => ({ ...prev, lat: e.target.value }))}
            required
          />
          <Input
            label="Longitude"
            type="number"
            step="any"
            value={coords.lng}
            onChange={(e) => setCoords((prev) => ({ ...prev, lng: e.target.value }))}
            required
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={gpsLoading}
            className="sm:col-span-2 mt-1"
          >
            Update Live Dispatch Coordinates
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResponderProfilePage;
