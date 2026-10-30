import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, PlusCircle, ArrowRight, MapPin, Radio, PhoneCall } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useIncidents } from '../../hooks/useIncidents.js';
import incidentService from '../../services/incidentService.js';
import { getErrorMessage } from '../../services/api.js';
import Button from '../../components/common/Button.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import SeverityBadge from '../../components/common/SeverityBadge.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmergencyBanner from '../../components/common/EmergencyBanner.jsx';
import { IncidentCardSkeleton } from '../../components/common/Skeleton.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { useToast } from '../../components/common/Toast.jsx';

export const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);

  // Fetch user's own active/recent emergencies
  const { incidents, loading, error, refresh } = useIncidents({ limit: 5 });

  const handleTriggerSOS = async () => {
    setSosLoading(true);
    setConfirmOpen(false);

    let locationCoords = null;
    let locationAvailable = false;

    // Attempt to acquire high-accuracy GPS coordinates
    try {
      if ('geolocation' in navigator) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          });
        });
        locationCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        locationAvailable = true;
      }
    } catch {
      // Location denied or timed out — fail-safe proceeds without GPS
      locationAvailable = false;
    }

    try {
      const incident = await incidentService.createIncident({
        isSOS: true,
        location: locationCoords,
        locationAvailable,
      });

      showToast('SOS Alert successfully broadcasted to nearby responders!', 'success');
      navigate(`/user/incidents/${incident._id}`);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSosLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-10">
      {/* 112 Notice */}
      <EmergencyBanner />

      {/* Hero SOS Action Card */}
      <section className="bg-gradient-to-b from-red-500/10 via-surface to-surface rounded-2xl border border-red-200/80 p-6 sm:p-10 shadow-sm flex flex-col items-center text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-emergency bg-red-100 px-3 py-1 rounded-full mb-3">
          Emergency Distress Dispatch
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-appText-primary font-display">
          Need Immediate Emergency Assistance?
        </h1>
        <p className="text-xs sm:text-sm text-appText-secondary max-w-md mt-1.5 mb-6">
          Press the SOS button below to broadcast an instant emergency signal with your current location to all available first responders.
        </p>

        {/* SOS Button: min-width 140px, pulsing animation */}
        <div className="relative my-2">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={sosLoading}
            className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-emergency text-white font-extrabold text-xl sm:text-2xl tracking-wider uppercase shadow-2xl flex flex-col items-center justify-center gap-1.5 animate-sos-pulse hover:bg-emergency-dark active:scale-95 transition-transform cursor-pointer border-4 border-white select-none touch-target"
            aria-label="Trigger Emergency SOS"
          >
            <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10" />
            <span>SOS</span>
            <span className="text-[10px] font-normal tracking-normal text-white/80 lowercase">
              tap to dispatch
            </span>
          </button>
        </div>

        {/* Immediate Call 112 Helpline Button */}
        <div className="mt-3">
          <a
            href="tel:112"
            id="call-112-sos"
            className="touch-target inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all select-none border border-red-500"
            aria-label="Call 112 National Emergency Helpline"
          >
            <PhoneCall className="w-4 h-4 animate-pulse" />
            <span>Call 112 (National Helpline)</span>
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-5 text-xs text-appText-secondary">

          <span className="inline-flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            GPS Broadcast Active
          </span>
          <span>•</span>
          <Link
            to="/user/report"
            className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Submit Detailed Incident Report
          </Link>
        </div>
      </section>

      {/* Active & Recent Incidents Section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-appText-primary font-display">
              Your Emergency Requests
            </h2>
            <p className="text-xs text-appText-secondary">
              Track status, active responders, and past incident history.
            </p>
          </div>
          <Link to="/user/incidents">
            <Button variant="ghost" size="sm" className="text-xs font-semibold">
              View All History <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <IncidentCardSkeleton />
            <IncidentCardSkeleton />
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-emergency">
            {error}
          </div>
        ) : incidents.length === 0 ? (
          <EmptyState
            title="No Active Incidents"
            message="You have no pending or active emergency requests at this moment."
            actionText="Report An Incident"
            onAction={() => navigate('/user/report')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incidents.map((inc) => (
              <Link
                key={inc._id}
                to={`/user/incidents/${inc._id}`}
                className="bg-surface p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary transition-all flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-primary">
                      {inc.incidentNumber}
                    </span>
                    <h3 className="text-sm font-bold text-appText-primary font-display mt-0.5">
                      {inc.category} {inc.isSOS && '(SOS)'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <SeverityBadge severity={inc.severity} />
                    <StatusBadge status={inc.status} />
                  </div>
                </div>

                <p className="text-xs text-appText-secondary line-clamp-2">
                  {inc.description || 'Emergency SOS Distress Signal'}
                </p>

                <div className="flex items-center justify-between text-[11px] text-appText-secondary pt-2 border-t border-gray-100">
                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {inc.address || (inc.locationAvailable ? 'GPS Pinpointed' : 'Location Not Provided')}
                  </span>
                  <span>{new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Confirmation Dialog for SOS */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleTriggerSOS}
        title="Confirm Emergency SOS Dispatch"
        message="Are you sure you want to trigger an immediate Emergency SOS? This will alert first responders and authorities in your vicinity with high priority."
        confirmText="Yes, Send SOS Now"
        confirmVariant="emergency"
        loading={sosLoading}
      />
    </div>
  );
};

export default UserDashboard;
