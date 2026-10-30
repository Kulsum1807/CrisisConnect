import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIncident } from '../../hooks/useIncident.js';
import { STATUSES, TERMINAL_STATUSES } from '../../constants/statuses.js';
import SeverityBadge from '../../components/common/SeverityBadge.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Button from '../../components/common/Button.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import NotifyContactsCard from '../../components/incident/NotifyContactsCard.jsx';
import IncidentMap from '../../components/map/IncidentMap.jsx';
import { useSocketEvent } from '../../hooks/useSocket.js';
import {
  MapPin,
  Clock,
  User,
  Phone,
  PhoneCall,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Navigation,
} from 'lucide-react';

export const IncidentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { incident, loading, error, refresh, cancelIncident, reportResponder } = useIncident(id);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [unsafeModalOpen, setUnsafeModalOpen] = useState(false);
  const [unsafeReason, setUnsafeReason] = useState('');
  const [reportingUnsafe, setReportingUnsafe] = useState(false);

  const handleReportUnsafe = async (e) => {
    e.preventDefault();
    setReportingUnsafe(true);
    try {
      await reportResponder(unsafeReason.trim());
      showToast('Safety concern reported. Responder removed and incident reset to queue.', 'warning');
      setUnsafeModalOpen(false);
      setUnsafeReason('');
      refresh();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setReportingUnsafe(false);
    }
  };

  const handleCancel = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      showToast('Please state a reason for cancellation', 'error');
      return;
    }

    setCancelling(true);
    try {
      await cancelIncident(cancelReason.trim());
      showToast('Emergency request cancelled', 'info');
      setCancelModalOpen(false);
      refresh();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-surface rounded-xl border border-red-200 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-emergency flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-appText-primary">Incident Not Available</h2>
        <p className="text-xs sm:text-sm text-appText-secondary">
          {error || 'The requested emergency report could not be found or you do not have permission to view it.'}
        </p>
        <Button variant="primary" size="sm" onClick={() => navigate('/user/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isTerminal = TERMINAL_STATUSES.includes(incident.status);
  const canCancel =
    !isTerminal && incident.status !== STATUSES.IN_PROGRESS;

  const [responderLiveCoords, setResponderLiveCoords] = useState(
    incident?.assignedResponder?.responderProfile?.currentLocation?.coordinates
      ? [
          incident.assignedResponder.responderProfile.currentLocation.coordinates[1],
          incident.assignedResponder.responderProfile.currentLocation.coordinates[0],
        ]
      : null
  );

  // Live real-time socket tracking: responder:location
  useSocketEvent('responder:location', (payload) => {
    if (payload?.incidentId === id && !isTerminal) {
      setResponderLiveCoords([payload.lat, payload.lng]);
    }
  });

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-12">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="touch-target inline-flex items-center text-xs font-semibold text-appText-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        <Button variant="outline" size="sm" onClick={refresh} className="text-xs">
          Refresh Status
        </Button>
      </div>

      {/* Main Status Header Card */}
      <div className="bg-surface p-5 sm:p-7 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-extrabold text-primary">
                {incident.incidentNumber}
              </span>
              {incident.isSOS && (
                <span className="text-xs font-bold text-emergency bg-red-100 px-2 py-0.5 rounded-full">
                  SOS TRIGGER
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-appText-primary font-display mt-1">
              {incident.category} Emergency
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
        </div>

        {/* Incident Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div>
            <span className="text-xs font-bold uppercase text-appText-secondary">Reported At</span>
            <p className="text-appText-primary font-medium mt-0.5">
              {new Date(incident.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-appText-secondary">Location</span>
            <p className="text-appText-primary font-medium mt-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emergency flex-shrink-0" />
              {incident.address || (incident.locationAvailable ? 'GPS Verified Coordinates' : 'Location Not Provided')}
            </p>
          </div>
        </div>

        {incident.description && (
          <div className="pt-2">
            <span className="text-xs font-bold uppercase text-appText-secondary">Description</span>
            <p className="text-xs sm:text-sm text-appText-primary mt-1 p-3 bg-gray-50 rounded-xl border border-gray-100 leading-relaxed">
              {incident.description}
            </p>
          </div>
        )}

        {/* Cancel Button */}
        {canCancel && (
          <div className="pt-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelModalOpen(true)}
              className="text-emergency border-red-200 hover:bg-red-50 text-xs"
            >
              Cancel This Emergency Request
            </Button>
          </div>
        )}

        {incident.status === STATUSES.IN_PROGRESS && (
          <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
            Emergency response is currently active on-scene. Cancellation is locked.
          </p>
        )}
      </div>

      {/* Emergency Incident Map & Live Tracker */}
      <div className="bg-surface p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emergency" />
            <h3 className="text-xs sm:text-sm font-bold text-appText-primary font-display uppercase tracking-wider">
              Emergency Map & Live Response Tracker
            </h3>
          </div>
          {responderLiveCoords && !isTerminal && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              Responder Live GPS
            </span>
          )}
        </div>

        <IncidentMap
          incidentLocation={incident.location}
          severity={incident.severity}
          category={incident.category}
          incidentNumber={incident.incidentNumber}
          address={incident.address}
          responderLocation={!isTerminal ? responderLiveCoords : null}
          responderName={incident.assignedResponder?.name}
          height="320px"
        />
      </div>

      {/* Notify My Emergency Contacts Section */}
      <NotifyContactsCard incident={incident} />

      {/* Assigned Responder Card */}
      {incident.assignedResponder && (
        <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-blue-200 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0 mt-0.5">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Assigned First Responder
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Responder
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      (incident.assignedResponder.responderProfile?.responderType || 'PROFESSIONAL') === 'VOLUNTEER'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {incident.assignedResponder.responderProfile?.responderType || 'PROFESSIONAL'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-appText-primary font-display mt-1">
                  {incident.assignedResponder.name}
                </h3>
                <p className="text-xs text-appText-secondary mt-0.5">
                  <span className="font-semibold text-appText-primary">Organisation:</span>{' '}
                  {incident.assignedResponder.responderProfile?.organisation || 'CrisisConnect Emergency Network'}
                </p>
                {incident.assignedResponder.responderProfile?.specialization?.length > 0 && (
                  <p className="text-[11px] text-appText-secondary mt-0.5">
                    Specializations: {incident.assignedResponder.responderProfile.specialization.join(', ')}
                  </p>
                )}
              </div>
            </div>

            {incident.assignedResponder.phone && (
              <a
                href={`tel:${incident.assignedResponder.phone}`}
                className="touch-target inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-bold shadow-sm transition-colors self-start sm:self-auto"
              >
                <Phone className="w-4 h-4" />
                Call Responder ({incident.assignedResponder.phone})
              </a>
            )}
          </div>

          {/* Safety Control Bar */}
          {!isTerminal && [STATUSES.ASSIGNED, STATUSES.ACCEPTED, STATUSES.IN_PROGRESS].includes(incident.status) && (
            <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-appText-secondary">
                <span className="font-semibold text-appText-primary">Safety note:</span> If you feel uncomfortable, at risk, or need alternate assistance, you can report this responder or call 112 directly.
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href="tel:112"
                  className="touch-target inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Call 112 (Emergency Police / Ambulance)
                </a>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setUnsafeModalOpen(true)}
                  className="text-xs font-bold"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                  I Feel Unsafe
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lifecycle Timeline */}
      <div className="bg-surface p-5 sm:p-7 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="text-sm font-bold text-appText-primary font-display uppercase tracking-wider mb-4">
          Incident Audit Timeline
        </h3>

        <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-gray-200">
          {incident.statusHistory?.map((step, idx) => (
            <div key={idx} className="relative flex items-start gap-4">
              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold z-10 flex-shrink-0 shadow-sm">
                {idx + 1}
              </div>
              <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-primary">{step.status}</span>
                  <span className="text-[11px] text-appText-secondary flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(step.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                {step.note && (
                  <p className="text-xs text-appText-secondary mt-1">{step.note}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cancellation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Emergency Incident"
      >
        <form onSubmit={handleCancel} className="flex flex-col gap-4">
          <p className="text-xs sm:text-sm text-appText-secondary">
            Please provide a reason for cancelling this emergency dispatch. This will be logged on the incident audit record.
          </p>

          <textarea
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Accidental trigger, issue resolved independently, etc."
            className="w-full px-3 py-2 bg-surface border border-gray-300 rounded-lg text-sm text-appText-primary focus:outline-none focus:ring-2 focus:ring-emergency"
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCancelModalOpen(false)}
              disabled={cancelling}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              loading={cancelling}
            >
              Confirm Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* "I Feel Unsafe" Modal */}
      <Modal
        isOpen={unsafeModalOpen}
        onClose={() => setUnsafeModalOpen(false)}
        title="Report Responder Safety Concern"
      >
        <form onSubmit={handleReportUnsafe} className="flex flex-col gap-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 leading-relaxed">
            <strong>Immediate Action:</strong> Submitting this report will immediately unassign this responder, set their profile offline for administrative review, and return your incident back to the queue so another verified responder can assist you.
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-appText-secondary">
              Describe what happened (optional, max 300 characters)
            </label>
            <textarea
              rows={3}
              maxLength={300}
              value={unsafeReason}
              onChange={(e) => setUnsafeReason(e.target.value)}
              placeholder="e.g. Responder is acting suspiciously, aggressive behavior, unverified vehicle, etc."
              className="w-full px-3 py-2 bg-surface border border-gray-300 rounded-lg text-sm text-appText-primary focus:outline-none focus:ring-2 focus:ring-emergency"
            />
            <span className="text-[11px] text-appText-secondary text-right">
              {unsafeReason.length}/300
            </span>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between gap-3">
            <span className="text-xs text-appText-primary font-medium">In immediate life threat?</span>
            <a
              href="tel:112"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-md text-xs font-bold"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Dial 112 Now
            </a>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setUnsafeModalOpen(false)}
              disabled={reportingUnsafe}
            >
              Go Back
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              loading={reportingUnsafe}
            >
              Confirm & Remove Responder
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default IncidentDetailsPage;
