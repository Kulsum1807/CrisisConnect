import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIncident } from '../../hooks/useIncident.js';
import { STATUSES, TERMINAL_STATUSES } from '../../constants/statuses.js';
import SeverityBadge from '../../components/common/SeverityBadge.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Button from '../../components/common/Button.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import IncidentMap from '../../components/map/IncidentMap.jsx';
import useResponderLocation from '../../hooks/useResponderLocation.js';
import MedicalInfoCard from '../../components/incident/MedicalInfoCard.jsx';
import {
  MapPin,
  Clock,
  User,
  Phone,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  PlayCircle,
  CheckSquare,
  Navigation,
  Radio,
} from 'lucide-react';

export const ResponderIncidentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { incident, loading, error, refresh, updateStatus } = useIncident(id);

  // Live responder GPS sharing
  const { isSharing, lastSharedAt } = useResponderLocation(id, incident?.status);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openStatusChange = (status) => {
    setTargetStatus(status);
    setStatusNote('');
    setStatusModalOpen(true);
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateStatus(targetStatus, statusNote.trim());
      showToast(`Incident transitioned to ${targetStatus}`, 'success');
      setStatusModalOpen(false);
      refresh();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
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
        <AlertTriangle className="w-8 h-8 text-emergency mx-auto" />
        <h2 className="text-lg font-bold text-appText-primary">Incident Unavailable</h2>
        <p className="text-xs sm:text-sm text-appText-secondary">{error}</p>
        <Button variant="primary" size="sm" onClick={() => navigate('/responder/dashboard')}>
          Back to Feed
        </Button>
      </div>
    );
  }

  const isTerminal = TERMINAL_STATUSES.includes(incident.status);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-12">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="touch-target inline-flex items-center text-xs font-semibold text-appText-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Incidents
        </button>
        <Button variant="outline" size="sm" onClick={refresh} className="text-xs">
          Refresh
        </Button>
      </div>

      {/* Main Command Header */}
      <div className="bg-surface p-5 sm:p-7 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <span className="text-xs font-mono font-extrabold text-primary">
              {incident.incidentNumber}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-appText-primary font-display mt-0.5">
              {incident.category} Emergency
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
        </div>

        {/* Operational Actions */}
        {!isTerminal && (
          <div className="p-4 bg-primary-50/50 rounded-xl border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-primary font-display">
                  Emergency Dispatch Actions
                </h3>
                {isSharing && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    Live GPS Sharing Active
                  </span>
                )}
              </div>
              <p className="text-xs text-appText-secondary mt-0.5">
                {incident.status === STATUSES.ACCEPTED && 'First responder on way to scene. Your live location is broadcasting to citizen.'}
                {incident.status === STATUSES.IN_PROGRESS && 'Responder actively managing scene.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {incident.status === STATUSES.ACCEPTED && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openStatusChange(STATUSES.IN_PROGRESS)}
                  className="font-bold"
                >
                  <PlayCircle className="w-4 h-4 mr-1.5" />
                  Mark On-Scene (In Progress)
                </Button>
              )}

              {incident.status === STATUSES.IN_PROGRESS && (
                <Button
                  variant="emergency"
                  size="sm"
                  onClick={() => openStatusChange(STATUSES.RESOLVED)}
                  className="font-bold"
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  Mark Case Resolved
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Tactical Emergency Incident Map */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-appText-secondary flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emergency" />
              Incident Scene Map
            </span>
            {incident.address && (
              <span className="text-xs text-appText-secondary truncate max-w-xs">
                {incident.address}
              </span>
            )}
          </div>
          <IncidentMap
            incidentLocation={incident.location}
            severity={incident.severity}
            category={incident.category}
            incidentNumber={incident.incidentNumber}
            address={incident.address}
            height="300px"
          />
        </div>

        {/* Reporter Info */}
        {incident.createdBy && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase text-appText-secondary">
                  Reporting Citizen
                </span>
                <h4 className="text-sm font-bold text-appText-primary">
                  {incident.createdBy.name}
                </h4>
              </div>
            </div>

            {incident.createdBy.phone && (
              <a
                href={`tel:${incident.createdBy.phone}`}
                className="touch-target inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                <Phone className="w-3.5 h-3.5" />
                Call Citizen ({incident.createdBy.phone})
              </a>
            )}
          </div>
        )}

        {/* Patient Emergency Medical Info Card */}
        <MedicalInfoCard
          incidentId={incident._id || incident.id}
          incidentStatus={incident.status}
        />

        {/* Incident Coordinates and Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div>
            <span className="text-xs font-bold uppercase text-appText-secondary">Location</span>
            <p className="text-appText-primary font-medium mt-1 flex items-center gap-1">
              <MapPin className="w-4 h-4 text-emergency flex-shrink-0" />
              {incident.address || (incident.locationAvailable ? 'GPS Verified' : 'Location Not Provided')}
            </p>
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-appText-secondary">Reported At</span>
            <p className="text-appText-primary font-medium mt-1">
              {new Date(incident.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Triage Responses */}
        {incident.checklist && Object.keys(incident.checklist).length > 0 && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Situational Triage Responses
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-xs">
              {Object.entries(incident.checklist).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <CheckSquare className={`w-3.5 h-3.5 ${val ? 'text-emergency' : 'text-gray-400'}`} />
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                  <strong className={val ? 'text-emergency' : 'text-gray-600'}>
                    {val ? 'Yes' : 'No'}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Audit Trail */}
      <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="text-xs sm:text-sm font-bold text-appText-primary font-display uppercase tracking-wider mb-4">
          Audit Timeline
        </h3>
        <div className="space-y-3">
          {incident.statusHistory?.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-xs">
              <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <strong className="text-primary">{step.status}</strong>
                  <span className="text-appText-secondary">{new Date(step.at).toLocaleTimeString()}</span>
                </div>
                {step.note && <p className="text-appText-secondary mt-0.5">{step.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Transition Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Confirm Status: ${targetStatus}`}
      >
        <form onSubmit={handleStatusSubmit} className="flex flex-col gap-4">
          <p className="text-xs sm:text-sm text-appText-secondary">
            Provide operational notes describing your on-scene actions.
          </p>
          <textarea
            rows={3}
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            placeholder="e.g. First aid administered, patient handed over to hospital team..."
            className="w-full px-3 py-2 bg-surface border border-gray-300 rounded-lg text-sm text-appText-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setStatusModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              Confirm Transition
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ResponderIncidentDetailsPage;
