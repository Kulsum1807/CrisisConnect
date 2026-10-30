import React from 'react';
import { useIncidentMedicalInfo } from '../../hooks/useMedicalInfo.js';
import { STATUSES, TERMINAL_STATUSES } from '../../constants/statuses.js';
import {
  HeartPulse,
  Lock,
  AlertCircle,
  Pill,
  Activity,
  FileText,
  ShieldCheck,
} from 'lucide-react';

/**
 * Responder incident detail Medical Info Card.
 *
 * Rules:
 * - Hidden completely when incident reaches RESOLVED, CANCELLED or REJECTED.
 * - Shows medical vitals when endpoint returns data.
 * - Shows small lock note when nothing is available ("The user has not shared medical info").
 */
export const MedicalInfoCard = ({ incidentId, incidentStatus }) => {
  // 1. Hide the card when the incident reaches terminal status
  const isTerminal = !incidentStatus || TERMINAL_STATUSES.includes(incidentStatus);
  if (isTerminal) {
    return null;
  }

  const { medicalInfo, loading, error } = useIncidentMedicalInfo(incidentId, incidentStatus);

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 animate-pulse flex items-center justify-center gap-2 text-xs text-appText-secondary">
        <HeartPulse className="w-4 h-4 text-red-500 animate-bounce" />
        Checking medical info access...
      </div>
    );
  }

  // 2. When nothing is available (either null returned or error), show small lock note
  if (!medicalInfo) {
    return (
      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2.5 text-xs text-appText-secondary">
        <div className="p-1.5 rounded-lg bg-gray-200 text-gray-600">
          <Lock className="w-3.5 h-3.5" />
        </div>
        <span>The user has not shared medical info</span>
      </div>
    );
  }

  // 3. When endpoint returns data, display the comprehensive Medical Info Card
  return (
    <div className="bg-surface p-5 rounded-2xl border-2 border-red-100 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-100 text-red-700">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-appText-primary font-display flex items-center gap-2">
              Patient Medical Info Card
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-2.5 h-2.5" /> Citizen Shared
              </span>
            </h3>
            <p className="text-[11px] text-appText-secondary">
              Authorized emergency medical disclosure for active scene care
            </p>
          </div>
        </div>

        {/* Blood Group Badge */}
        {medicalInfo.bloodGroup && medicalInfo.bloodGroup !== 'UNKNOWN' ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-600 text-white font-extrabold shadow-sm w-fit">
            <span className="text-[10px] tracking-wider uppercase opacity-90 font-mono">Blood</span>
            <span className="text-base font-display">{medicalInfo.bloodGroup}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold w-fit">
            <span className="text-[10px] text-gray-500 uppercase">Blood</span>
            <span>Unknown</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        {/* Allergies */}
        <div className="p-3 bg-red-50/50 rounded-xl border border-red-100/80 space-y-2">
          <span className="font-bold text-red-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            Allergies
          </span>
          {medicalInfo.allergies && medicalInfo.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {medicalInfo.allergies.map((allergy, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-semibold border border-red-200 text-xs"
                >
                  {allergy}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic text-[11px]">No known allergies reported.</p>
          )}
        </div>

        {/* Pre-existing Conditions */}
        <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/80 space-y-2">
          <span className="font-bold text-amber-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 text-amber-600" />
            Medical Conditions
          </span>
          {medicalInfo.conditions && medicalInfo.conditions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {medicalInfo.conditions.map((cond, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold border border-amber-200 text-xs"
                >
                  {cond}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic text-[11px]">No conditions listed.</p>
          )}
        </div>
      </div>

      {/* Medications */}
      {medicalInfo.medications && medicalInfo.medications.length > 0 && (
        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/80 space-y-2">
          <span className="font-bold text-blue-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
            <Pill className="w-3.5 h-3.5 text-blue-600" />
            Current Medications
          </span>
          <div className="flex flex-wrap gap-1.5">
            {medicalInfo.medications.map((med, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-semibold border border-blue-200 text-xs"
              >
                {med}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes / Special Clinical Instructions */}
      {medicalInfo.notes && (
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
          <span className="font-bold text-appText-secondary flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5 text-primary" />
            Clinical Notes & Patient Directives
          </span>
          <p className="text-xs sm:text-sm text-appText-primary font-medium whitespace-pre-wrap leading-relaxed">
            {medicalInfo.notes}
          </p>
        </div>
      )}
    </div>
  );
};

export default MedicalInfoCard;
