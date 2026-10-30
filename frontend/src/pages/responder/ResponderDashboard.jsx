import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import responderService from '../../services/responderService.js';
import { AVAILABILITY, VERIFICATION_STATUSES } from '../../constants/responder.js';
import { getErrorMessage } from '../../services/api.js';
import { useSocket, useSocketEvent } from '../../hooks/useSocket.js';
import Button from '../../components/common/Button.jsx';
import SeverityBadge from '../../components/common/SeverityBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { IncidentCardSkeleton } from '../../components/common/Skeleton.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import {
  Radio,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export const ResponderDashboard = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [availability, setAvailability] = useState(
    user?.responderProfile?.availability || AVAILABILITY.OFFLINE
  );
  const [togglingStatus, setTogglingStatus] = useState(false);

  const [availableFeed, setAvailableFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(null);

  const [actionLoadingId, setActionLoadingId] = useState(null);

  const isVerified =
    user?.responderProfile?.verificationStatus === VERIFICATION_STATUSES.VERIFIED;

  const { reconnectCount } = useSocket();

  const fetchAvailableFeed = async () => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const data = await responderService.getIncidents({ scope: 'available' });
      setAvailableFeed(data.items || []);
    } catch (err) {
      setFeedError(getErrorMessage(err));
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableFeed();
  }, []);

  // Re-fetch on socket reconnect
  useEffect(() => {
    if (reconnectCount > 0) {
      fetchAvailableFeed();
    }
  }, [reconnectCount]);

  // Live Socket Event: New emergency reported nearby
  useSocketEvent('incident:new', (payload) => {
    setAvailableFeed((prev) => {
      const exists = prev.some((item) => (item._id || item.incidentId) === payload.incidentId);
      if (exists) return prev;
      const newItem = {
        _id: payload.incidentId || payload.id || payload._id,
        id: payload.id || payload.incidentId || payload._id,
        incidentNumber: payload.incidentNumber,
        category: payload.category,
        severity: payload.severity,
        approximateLocation: payload.approximateLocation,
        distanceKm: payload.distanceKm,
        createdAt: payload.createdAt,
        status: 'PENDING',
      };
      return [newItem, ...prev];
    });
  });

  // Live Socket Event: Incident claimed by another responder
  useSocketEvent('incident:taken', (payload) => {
    setAvailableFeed((prev) =>
      prev.filter((item) => (item._id || item.incidentId) !== payload.incidentId)
    );
  });

  // Live Socket Event: Incident updated/cancelled
  useSocketEvent('incident:updated', (payload) => {
    setAvailableFeed((prev) => {
      if (payload.status !== 'PENDING') {
        return prev.filter((item) => (item._id || item.incidentId) !== payload.incidentId);
      }
      return prev.map((item) =>
        (item._id || item.incidentId) === payload.incidentId
          ? { ...item, status: payload.status, severity: payload.severity || item.severity }
          : item
      );
    });
  });

  const handleToggleAvailability = async () => {
    const nextState =
      availability === AVAILABILITY.ONLINE ? AVAILABILITY.OFFLINE : AVAILABILITY.ONLINE;

    setTogglingStatus(true);
    try {
      await responderService.updateStatus(nextState);
      setAvailability(nextState);
      await refreshUser();
      showToast(`Status switched to ${nextState}`, 'success');
      fetchAvailableFeed();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleAcceptIncident = async (incidentId) => {
    setActionLoadingId(incidentId);
    try {
      const incident = await responderService.acceptIncident(incidentId);
      showToast('Incident successfully claimed! Proceeding to live response.', 'success');
      navigate(`/responder/incidents/${incident._id}`);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
      // Refresh feed in case someone else claimed it
      fetchAvailableFeed();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineIncident = async (incidentId) => {
    setActionLoadingId(incidentId);
    try {
      await responderService.declineIncident(incidentId, 'Unavailable to respond');
      showToast('Incident declined and removed from feed', 'info');
      fetchAvailableFeed();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Verification Notice Banner */}
      {!isVerified && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <h4 className="font-bold">Responder Application Under Review</h4>
            <p className="mt-0.5 text-amber-800">
              Your profile is currently <strong>PENDING</strong> verification by an administrator. You will be able to toggle <strong>ONLINE</strong> and claim active emergencies once approved.
            </p>
          </div>
        </div>
      )}

      {/* Responder Availability Control Card */}
      <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm transition-colors ${
              availability === AVAILABILITY.ONLINE
                ? 'bg-emerald-600 animate-pulse'
                : 'bg-slate-600'
            }`}
          >
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-appText-secondary">
                Duty Status
              </span>
              <span
                className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                  availability === AVAILABILITY.ONLINE
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {availability}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-appText-primary font-display mt-0.5">
              {availability === AVAILABILITY.ONLINE
                ? 'Active & Receiving Emergency Alerts'
                : 'Offline — Not Receiving Dispatches'}
            </h2>
          </div>
        </div>

        <Button
          variant={availability === AVAILABILITY.ONLINE ? 'secondary' : 'primary'}
          size="md"
          onClick={handleToggleAvailability}
          disabled={!isVerified || togglingStatus}
          loading={togglingStatus}
          className="w-full sm:w-auto font-bold"
        >
          {availability === AVAILABILITY.ONLINE ? 'Go Offline' : 'Go Online for Duty'}
        </Button>
      </div>

      {/* Available Emergency Feed */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-appText-primary font-display flex items-center gap-2">
              <span>Live Available Emergency Feed</span>
              {availableFeed.length > 0 && (
                <span className="text-xs font-bold bg-red-100 text-emergency px-2 py-0.5 rounded-full">
                  {availableFeed.length}
                </span>
              )}
            </h2>
            <p className="text-xs text-appText-secondary">
              Emergencies in your sector awaiting immediate responder claim.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAvailableFeed}
            disabled={feedLoading}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${feedLoading ? 'animate-spin' : ''}`} />
            Refresh Feed
          </Button>
        </div>

        {feedLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <IncidentCardSkeleton />
            <IncidentCardSkeleton />
          </div>
        ) : feedError ? (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-emergency">
            {feedError}
          </div>
        ) : availableFeed.length === 0 ? (
          <EmptyState
            title="All Emergencies Handled"
            message="No unclaimed incidents currently in the queue. Keep your availability ONLINE to receive incoming dispatches."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableFeed.map((inc) => (
              <div
                key={inc._id}
                className="bg-surface p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-primary">
                        {inc.incidentNumber}
                      </span>
                      <h3 className="text-base font-bold text-appText-primary font-display mt-0.5">
                        {inc.category} {inc.isSOS && '(SOS Trigger)'}
                      </h3>
                    </div>
                    <SeverityBadge severity={inc.severity} />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-appText-secondary mt-3">
                    <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span>Reported at {new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-appText-secondary mt-3 pt-2.5 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emergency flex-shrink-0" />
                      <span className="truncate">
                        {inc.approximateLocation
                          ? `Approx. ${inc.approximateLocation.lat}, ${inc.approximateLocation.lng}`
                          : 'Approx. sector unavailable'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-appText-primary font-medium">
                      <span>
                        {inc.distanceKm !== null && inc.distanceKm !== undefined
                          ? `~${inc.distanceKm} km away`
                          : 'Distance calculated on accept'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Accept / Decline actions */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDeclineIncident(inc._id)}
                    disabled={actionLoadingId === inc._id}
                    className="text-xs"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1 text-gray-500" />
                    Decline
                  </Button>
                  <Button
                    variant="emergency"
                    size="sm"
                    onClick={() => handleAcceptIncident(inc._id)}
                    loading={actionLoadingId === inc._id}
                    className="text-xs font-bold"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Accept / Claim
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponderDashboard;
