import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService.js';
import { getErrorMessage } from '../../services/api.js';
import { VERIFICATION_STATUSES, RESPONDER_TYPES } from '../../constants/responder.js';
import Button from '../../components/common/Button.jsx';
import Modal from '../../components/common/Modal.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import {
  ShieldCheck,
  UserCheck,
  XCircle,
  CheckCircle,
  Building2,
  PhoneCall,
  Briefcase,
  FileCheck2,
  AlertCircle,
} from 'lucide-react';

export const AdminRespondersPage = () => {
  const { showToast } = useToast();

  const [tab, setTab] = useState(VERIFICATION_STATUSES.PENDING);
  const [typeFilter, setTypeFilter] = useState('');
  const [responders, setResponders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedResponder, setSelectedResponder] = useState(null);
  const [targetStatus, setTargetStatus] = useState(VERIFICATION_STATUSES.VERIFIED);
  const [verificationNote, setVerificationNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Verification Checklist State (for admin review protocol)
  const [checklist, setChecklist] = useState({
    identityVerified: false,
    referenceConfirmed: false,
    readinessEvaluated: false,
  });

  const fetchResponders = async () => {
    setLoading(true);
    try {
      const params = { verificationStatus: tab };
      if (typeFilter) params.responderType = typeFilter;
      const data = await adminService.getResponders(params);
      setResponders(data?.items || data || []);
    } catch (err) {
      setResponders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResponders();
  }, [tab, typeFilter]);

  const openVerificationModal = (responder, status) => {
    setSelectedResponder(responder);
    setTargetStatus(status);
    setVerificationNote(
      status === VERIFICATION_STATUSES.VERIFIED
        ? 'Identity confirmed, reference contact checked, and offline readiness criteria satisfied.'
        : 'Application rejected after assessment.'
    );
    setChecklist({
      identityVerified: false,
      referenceConfirmed: false,
      readinessEvaluated: false,
    });
    setModalOpen(true);
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!selectedResponder) return;

    setSubmitting(true);
    try {
      await adminService.verifyResponder(selectedResponder._id, targetStatus, verificationNote);
      showToast(
        `Responder ${selectedResponder.name} is now ${targetStatus}`,
        targetStatus === VERIFICATION_STATUSES.VERIFIED ? 'success' : 'info'
      );
      setModalOpen(false);
      fetchResponders();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-appText-primary font-display">
            First Responder Accreditation & Vetting
          </h1>
          <p className="text-xs sm:text-sm text-appText-secondary mt-1">
            Review applicant credentials, reference contacts, and authorize emergency dispatch eligibility.
          </p>
        </div>
      </div>

      {/* Status Tabs and Type Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {[
            { label: 'Pending Review', value: VERIFICATION_STATUSES.PENDING },
            { label: 'Verified & Active', value: VERIFICATION_STATUSES.VERIFIED },
            { label: 'Rejected', value: VERIFICATION_STATUSES.REJECTED },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors touch-target ${
                tab === item.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-appText-secondary hover:text-appText-primary'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Responder Type Filter */}
        <div className="flex items-center gap-2 pb-2 sm:pb-0">
          <span className="text-xs text-appText-secondary font-medium">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-surface border border-gray-300 rounded-lg px-2.5 py-1.5 text-appText-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Types</option>
            <option value={RESPONDER_TYPES.PROFESSIONAL}>Professional (EMTs / Fire / Police)</option>
            <option value={RESPONDER_TYPES.VOLUNTEER}>Volunteer First Responders</option>
          </select>
        </div>
      </div>

      {/* Responders Table */}
      <div className="bg-surface rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-appText-secondary">
            Loading responder queue...
          </div>
        ) : responders.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={`No ${tab} Responders`}
            message={`There are currently no responder profiles in the ${tab} queue${
              typeFilter ? ` matching type '${typeFilter}'` : ''
            }.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-appText-secondary font-bold uppercase text-[11px] tracking-wider">
                  <th className="p-3.5 sm:p-4">Responder & Type</th>
                  <th className="p-3.5 sm:p-4">Contact Info</th>
                  <th className="p-3.5 sm:p-4">Organisation & Reference</th>
                  <th className="p-3.5 sm:p-4">Specialization</th>
                  <th className="p-3.5 sm:p-4">Status & Notes</th>
                  <th className="p-3.5 sm:p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {responders.map((r) => {
                  const type = r.responderProfile?.responderType || RESPONDER_TYPES.PROFESSIONAL;
                  const isVol = type === RESPONDER_TYPES.VOLUNTEER;
                  return (
                    <tr key={r._id} className="hover:bg-gray-50/50">
                      <td className="p-3.5 sm:p-4">
                        <div className="font-bold text-appText-primary">{r.name}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              isVol
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {type}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {r.responderProfile?.availability || 'OFFLINE'}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 sm:p-4 text-appText-secondary">
                        <div className="font-medium text-appText-primary">{r.email}</div>
                        <div className="font-mono text-[11px] text-gray-500 mt-0.5">{r.phone}</div>
                      </td>

                      <td className="p-3.5 sm:p-4 text-appText-secondary">
                        <div className="flex items-center gap-1 text-appText-primary font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{r.responderProfile?.organisation || 'Independent'}</span>
                        </div>
                        {r.responderProfile?.referenceContact && (
                          <div className="flex items-center gap-1 text-gray-500 text-[11px] mt-0.5">
                            <PhoneCall className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>Ref: {r.responderProfile.referenceContact}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 sm:p-4">
                        <div className="flex flex-wrap gap-1">
                          {r.responderProfile?.specialization && r.responderProfile.specialization.length > 0 ? (
                            r.responderProfile.specialization.map((s) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary"
                              >
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-gray-400">General</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 sm:p-4 text-appText-secondary max-w-xs">
                        {tab === VERIFICATION_STATUSES.VERIFIED ? (
                          <div>
                            <div className="text-emerald-700 font-semibold flex items-center gap-1 text-xs">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Verified Responder</span>
                            </div>
                            {r.responderProfile?.verifiedAt && (
                              <div className="text-[10px] text-gray-500 mt-0.5">
                                {new Date(r.responderProfile.verifiedAt).toLocaleDateString()}
                              </div>
                            )}
                            {r.responderProfile?.verificationNote && (
                              <div className="text-[11px] text-gray-600 italic mt-0.5 line-clamp-2">
                                &ldquo;{r.responderProfile.verificationNote}&rdquo;
                              </div>
                            )}
                          </div>
                        ) : tab === VERIFICATION_STATUSES.REJECTED ? (
                          <div>
                            <span className="text-red-700 font-semibold flex items-center gap-1 text-xs">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Application Rejected</span>
                            </span>
                            {r.responderProfile?.verificationNote && (
                              <div className="text-[11px] text-gray-600 italic mt-0.5 line-clamp-2">
                                &ldquo;{r.responderProfile.verificationNote}&rdquo;
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-700 font-medium text-xs flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Pending Accreditation</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 sm:p-4 text-right">
                        {tab === VERIFICATION_STATUSES.PENDING ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openVerificationModal(r, VERIFICATION_STATUSES.VERIFIED)}
                              className="text-xs font-bold"
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => openVerificationModal(r, VERIFICATION_STATUSES.REJECTED)}
                              className="text-xs"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              openVerificationModal(
                                r,
                                tab === VERIFICATION_STATUSES.VERIFIED
                                  ? VERIFICATION_STATUSES.REJECTED
                                  : VERIFICATION_STATUSES.VERIFIED
                              )
                            }
                            className="text-xs text-appText-secondary"
                          >
                            {tab === VERIFICATION_STATUSES.VERIFIED ? 'Revoke' : 'Re-verify'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vetting & Accreditation Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${targetStatus === VERIFICATION_STATUSES.VERIFIED ? 'Accredit & Approve' : 'Reject'} Responder`}
      >
        <form onSubmit={handleVerifySubmit} className="flex flex-col gap-4">
          <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-appText-primary text-sm">
                {selectedResponder?.name}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800">
                {selectedResponder?.responderProfile?.responderType}
              </span>
            </div>
            <div className="text-appText-secondary">
              Organisation: <strong>{selectedResponder?.responderProfile?.organisation || 'N/A'}</strong>
            </div>
            <div className="text-appText-secondary">
              Reference Contact: <strong>{selectedResponder?.responderProfile?.referenceContact || 'N/A'}</strong>
            </div>
            <div className="text-appText-secondary">
              Email: <strong>{selectedResponder?.email}</strong> | Phone: <strong>{selectedResponder?.phone}</strong>
            </div>
          </div>

          {targetStatus === VERIFICATION_STATUSES.VERIFIED && (
            <div className="flex flex-col gap-2 p-3 bg-blue-50/60 rounded-lg border border-blue-200">
              <span className="text-[11px] font-bold uppercase text-blue-900 tracking-wider flex items-center gap-1">
                <FileCheck2 className="w-3.5 h-3.5 text-blue-700" />
                Online & Offline Verification Checklist
              </span>

              <label className="flex items-center gap-2 text-xs text-blue-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.identityVerified}
                  onChange={(e) =>
                    setChecklist({ ...checklist, identityVerified: e.target.checked })
                  }
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span>Official government / medical ID credentials verified</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-blue-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.referenceConfirmed}
                  onChange={(e) =>
                    setChecklist({ ...checklist, referenceConfirmed: e.target.checked })
                  }
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span>Reference contact / sponsoring organisation confirmed</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-blue-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.readinessEvaluated}
                  onChange={(e) =>
                    setChecklist({ ...checklist, readinessEvaluated: e.target.checked })
                  }
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span>Offline physical readiness / emergency drill criteria evaluated</span>
              </label>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-appText-secondary uppercase">
              Admin Accreditation Notes
            </label>
            <textarea
              rows={3}
              value={verificationNote}
              onChange={(e) => setVerificationNote(e.target.value)}
              placeholder="e.g. Cleared background check, verified EMT certificate #9281, ready for dispatch."
              className="w-full px-3 py-2 bg-surface border border-gray-300 rounded-lg text-sm text-appText-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={targetStatus === VERIFICATION_STATUSES.VERIFIED ? 'primary' : 'danger'}
              size="sm"
              loading={submitting}
            >
              {targetStatus === VERIFICATION_STATUSES.VERIFIED ? 'Grant Verification' : 'Reject Applicant'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminRespondersPage;
