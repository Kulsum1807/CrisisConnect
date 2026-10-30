import React, { useState } from 'react';
import { useIncidents } from '../../hooks/useIncidents.js';
import incidentService from '../../services/incidentService.js';
import { adminService } from '../../services/adminService.js';
import { getErrorMessage } from '../../services/api.js';
import { STATUSES, STATUS_LABELS } from '../../constants/statuses.js';
import { SEVERITIES } from '../../constants/severities.js';
import { CATEGORIES, CATEGORY_LABELS } from '../../constants/categories.js';
import SeverityBadge from '../../components/common/SeverityBadge.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Button from '../../components/common/Button.jsx';
import Select from '../../components/common/Select.jsx';
import Modal from '../../components/common/Modal.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { AlertCircle, UserCheck, ShieldAlert, RefreshCw, XCircle, MapPin } from 'lucide-react';

export const AdminIncidentsPage = () => {
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);

  const { incidents, pagination, loading, error, refresh } = useIncidents({
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
    category: categoryFilter || undefined,
    page,
    limit: 15,
  });

  // Assign Responder Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [respondersList, setRespondersList] = useState([]);
  const [selectedResponderId, setSelectedResponderId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Severity Override Modal State
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [newSeverity, setNewSeverity] = useState(SEVERITIES.HIGH);
  const [overrideReason, setOverrideReason] = useState('');
  const [overriding, setOverriding] = useState(false);

  const openAssignModal = async (incident) => {
    setSelectedIncident(incident);
    setSelectedResponderId('');
    setAssignModalOpen(true);
    try {
      const data = await adminService.getResponders({ verificationStatus: 'VERIFIED' });
      setRespondersList(data?.items || data || []);
    } catch {
      setRespondersList([]);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResponderId) {
      showToast('Please select a verified responder', 'error');
      return;
    }

    setAssigning(true);
    try {
      await incidentService.assignResponder(selectedIncident._id, selectedResponderId);
      showToast('Responder assigned successfully', 'success');
      setAssignModalOpen(false);
      refresh();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setAssigning(false);
    }
  };

  const openOverrideModal = (incident) => {
    setSelectedIncident(incident);
    setNewSeverity(incident.severity);
    setOverrideReason('');
    setOverrideModalOpen(true);
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      showToast('Reason is required to override clinical severity', 'error');
      return;
    }

    setOverriding(true);
    try {
      await incidentService.overrideSeverity(selectedIncident._id, newSeverity, overrideReason.trim());
      showToast('Severity level overridden', 'success');
      setOverrideModalOpen(false);
      refresh();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setOverriding(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-appText-primary font-display">
            Master Incident Pool & Dispatch Controls
          </h1>
          <p className="text-xs sm:text-sm text-appText-secondary mt-1">
            Global jurisdiction triage: manually assign responders or override severity.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="w-fit">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Pool
        </Button>
      </div>

      {/* Filter Row */}
      <div className="bg-surface p-4 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select
          label="Filter Status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All Statuses' },
            ...Object.entries(STATUSES).map(([k, v]) => ({ value: v, label: STATUS_LABELS[v] })),
          ]}
        />

        <Select
          label="Filter Severity"
          value={severityFilter}
          onChange={(e) => {
            setSeverityFilter(e.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All Severities' },
            ...Object.values(SEVERITIES).map((s) => ({ value: s, label: s })),
          ]}
        />

        <Select
          label="Filter Category"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All Categories' },
            ...Object.entries(CATEGORIES).map(([k, v]) => ({ value: v, label: CATEGORY_LABELS[v] })),
          ]}
        />
      </div>

      {/* Incidents Table */}
      <div className="bg-surface rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-appText-secondary">
            Loading incidents...
          </div>
        ) : incidents.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title="No Incidents Match Filters"
            message="No incidents found with the selected criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-appText-secondary font-bold uppercase text-[11px] tracking-wider">
                  <th className="p-3.5 sm:p-4">Incident ID</th>
                  <th className="p-3.5 sm:p-4">Category</th>
                  <th className="p-3.5 sm:p-4">Severity</th>
                  <th className="p-3.5 sm:p-4">Status</th>
                  <th className="p-3.5 sm:p-4">Assigned To</th>
                  <th className="p-3.5 sm:p-4 text-right">Dispatcher Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {incidents.map((inc) => (
                  <tr key={inc._id} className="hover:bg-gray-50/50">
                    <td className="p-3.5 sm:p-4 font-mono font-bold text-primary">
                      {inc.incidentNumber}
                    </td>
                    <td className="p-3.5 sm:p-4">
                      <div className="font-bold text-appText-primary">{inc.category}</div>
                      <div className="text-[11px] text-appText-secondary truncate max-w-xs">
                        {inc.description || 'Emergency SOS'}
                      </div>
                    </td>
                    <td className="p-3.5 sm:p-4">
                      <SeverityBadge severity={inc.severity} />
                    </td>
                    <td className="p-3.5 sm:p-4">
                      <StatusBadge status={inc.status} />
                    </td>
                    <td className="p-3.5 sm:p-4 text-appText-secondary">
                      {inc.assignedResponder?.name || <span className="text-gray-400 italic">Unassigned</span>}
                    </td>
                    <td className="p-3.5 sm:p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inc.status === STATUSES.PENDING && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openAssignModal(inc)}
                            className="text-xs"
                          >
                            Assign
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openOverrideModal(inc)}
                          className="text-xs"
                        >
                          Override Severity
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Assignment Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Assign Responder: ${selectedIncident?.incidentNumber}`}
      >
        <form onSubmit={handleAssignSubmit} className="flex flex-col gap-4">
          <p className="text-xs sm:text-sm text-appText-secondary">
            Select a verified first responder to handle this emergency.
          </p>

          <Select
            label="Verified Responder"
            value={selectedResponderId}
            onChange={(e) => setSelectedResponderId(e.target.value)}
            options={respondersList.map((r) => ({
              value: r._id,
              label: `${r.name} (${r.responderProfile?.availability || 'OFFLINE'})`,
            }))}
            placeholder="Choose responder..."
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setAssignModalOpen(false)} disabled={assigning}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={assigning}>
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Severity Override Modal */}
      <Modal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title={`Override Severity: ${selectedIncident?.incidentNumber}`}
      >
        <form onSubmit={handleOverrideSubmit} className="flex flex-col gap-4">
          <Select
            label="New Severity Level"
            value={newSeverity}
            onChange={(e) => setNewSeverity(e.target.value)}
            options={Object.values(SEVERITIES).map((s) => ({ value: s, label: s }))}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-appText-secondary uppercase">
              Clinical / Administrative Justification <span className="text-emergency">*</span>
            </label>
            <textarea
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="State reason for overriding system severity rule..."
              className="w-full px-3 py-2 bg-surface border border-gray-300 rounded-lg text-sm text-appText-primary focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setOverrideModalOpen(false)} disabled={overriding}>
              Cancel
            </Button>
            <Button type="submit" variant="emergency" size="sm" loading={overriding}>
              Save Override
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminIncidentsPage;
