import React, { useState, useEffect } from 'react';
import { useMyMedicalInfo } from '../../hooks/useMedicalInfo.js';
import Button from '../common/Button.jsx';
import Modal from '../common/Modal.jsx';
import { useToast } from '../common/Toast.jsx';
import {
  HeartPulse,
  ShieldAlert,
  Plus,
  X,
  Lock,
  Trash2,
  Info,
  CheckCircle2,
} from 'lucide-react';

const BLOOD_GROUPS = [
  'UNKNOWN',
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
];

/**
 * Reusable Tag Input Component for arrays of items (allergies, conditions, medications).
 */
const TagInput = ({
  label,
  tags = [],
  onChange,
  placeholder,
  helperText,
  maxTags = 10,
  maxChars = 60,
  tagColorClass = 'bg-primary/10 text-primary border-primary/20',
  id,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [itemError, setItemError] = useState('');

  const handleAdd = (e) => {
    if (e) e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) return;

    if (tags.length >= maxTags) {
      setItemError(`Maximum of ${maxTags} items allowed.`);
      return;
    }

    if (trimmed.length > maxChars) {
      setItemError(`Each item must be at most ${maxChars} characters.`);
      return;
    }

    if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setItemError('Item already added.');
      return;
    }

    onChange([...tags, trimmed]);
    setInputVal('');
    setItemError('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (indexToRemove) => {
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-semibold text-appText-primary">
          {label}
        </label>
        <span className="text-[11px] text-appText-secondary">
          {tags.length} / {maxTags}
        </span>
      </div>

      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            if (itemError) setItemError('');
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxChars}
          disabled={tags.length >= maxTags}
          className="flex-1 px-3 py-2 bg-surface border border-gray-300 rounded-lg text-xs sm:text-sm text-appText-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:opacity-60"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleAdd}
          disabled={!inputVal.trim() || tags.length >= maxTags}
          className="text-xs px-3"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add
        </Button>
      </div>

      {itemError && <span className="text-[11px] text-emergency">{itemError}</span>}
      {helperText && !itemError && (
        <span className="text-[11px] text-appText-secondary">{helperText}</span>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${tagColorClass}`}
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="hover:opacity-75 text-current p-0.5 rounded focus:outline-none"
                aria-label={`Remove ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const MedicalInfoSection = () => {
  const { showToast } = useToast();
  const {
    medicalInfo,
    loading,
    saving,
    saveMedicalInfo,
    clearMedicalInfo,
  } = useMyMedicalInfo();

  const [formData, setFormData] = useState({
    bloodGroup: 'UNKNOWN',
    allergies: [],
    conditions: [],
    medications: [],
    notes: '',
    shareWithResponders: false,
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Sync state when medicalInfo is fetched
  useEffect(() => {
    if (medicalInfo) {
      setFormData({
        bloodGroup: medicalInfo.bloodGroup || 'UNKNOWN',
        allergies: medicalInfo.allergies || [],
        conditions: medicalInfo.conditions || [],
        medications: medicalInfo.medications || [],
        notes: medicalInfo.notes || '',
        shareWithResponders: Boolean(medicalInfo.shareWithResponders),
      });
    }
  }, [medicalInfo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveMedicalInfo(formData);
      showToast('Medical info updated successfully', 'success');
    } catch (err) {
      showToast(err?.response?.data?.message || err.message || 'Error saving medical info', 'error');
    }
  };

  const handleClear = async () => {
    try {
      await clearMedicalInfo();
      setFormData({
        bloodGroup: 'UNKNOWN',
        allergies: [],
        conditions: [],
        medications: [],
        notes: '',
        shareWithResponders: false,
      });
      setDeleteModalOpen(false);
      showToast('Medical information cleared', 'success');
    } catch (err) {
      showToast(err?.response?.data?.message || err.message || 'Error clearing medical info', 'error');
    }
  };

  if (loading) {
    return (
      <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-appText-primary font-display">
                Medical Info Card
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Lock className="w-2.5 h-2.5" /> Private Health Data
              </span>
            </div>
            <p className="text-xs text-appText-secondary mt-0.5">
              Securely store emergency health vitals for first responders
            </p>
          </div>
        </div>

        {medicalInfo && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDeleteModalOpen(true)}
            className="text-xs text-emergency hover:bg-emergency/10"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Blood Group Select */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bloodGroup" className="text-xs font-semibold text-appText-primary">
            Blood Group
          </label>
          <div className="relative">
            <select
              id="bloodGroup"
              value={formData.bloodGroup}
              onChange={(e) => setFormData((prev) => ({ ...prev, bloodGroup: e.target.value }))}
              className="w-full px-3 py-2.5 bg-surface border border-gray-300 rounded-lg text-xs sm:text-sm text-appText-primary font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>
                  {bg === 'UNKNOWN' ? 'Unknown / Not Tested' : bg}
                </option>
              ))}
            </select>
          </div>
          <span className="text-[11px] text-appText-secondary">
            Crucial for paramedics in acute trauma and blood transfusion situations.
          </span>
        </div>

        {/* Tag Inputs */}
        <TagInput
          id="allergies-input"
          label="Allergies"
          tags={formData.allergies}
          onChange={(newTags) => setFormData((prev) => ({ ...prev, allergies: newTags }))}
          placeholder="e.g. Penicillin, Peanuts, Latex..."
          helperText="Press Enter or click Add. Maximum 10 items, 60 characters each."
          tagColorClass="bg-red-50 text-red-700 border-red-200"
        />

        <TagInput
          id="conditions-input"
          label="Pre-existing Medical Conditions"
          tags={formData.conditions}
          onChange={(newTags) => setFormData((prev) => ({ ...prev, conditions: newTags }))}
          placeholder="e.g. Asthma, Diabetes Type 1, Cardiac Arrhythmia..."
          helperText="Chronic medical conditions responders should be aware of."
          tagColorClass="bg-amber-50 text-amber-700 border-amber-200"
        />

        <TagInput
          id="medications-input"
          label="Current Medications"
          tags={formData.medications}
          onChange={(newTags) => setFormData((prev) => ({ ...prev, medications: newTags }))}
          placeholder="e.g. Metformin, Albuterol Inhaler, Warfarin..."
          helperText="Daily prescriptions or critical emergency medications."
          tagColorClass="bg-blue-50 text-blue-700 border-blue-200"
        />

        {/* Notes (Max 300) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="medicalNotes" className="text-xs font-semibold text-appText-primary">
              Clinical Notes / Emergency Instructions
            </label>
            <span
              className={`text-[11px] ${
                formData.notes.length > 280 ? 'text-emergency font-bold' : 'text-appText-secondary'
              }`}
            >
              {formData.notes.length} / 300
            </span>
          </div>
          <textarea
            id="medicalNotes"
            rows={3}
            maxLength={300}
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Special instructions (e.g. Pacemaker implanted in 2021; epipen kept in outer backpack pocket)..."
            className="w-full px-3 py-2 bg-surface border border-gray-300 rounded-lg text-xs sm:text-sm text-appText-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Sharing Toggle and Privacy Note */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <label
                htmlFor="shareWithRespondersToggle"
                className="text-xs sm:text-sm font-bold text-appText-primary cursor-pointer select-none"
              >
                Share with the responder assigned to my incident
              </label>
              <p className="text-[11px] text-appText-secondary mt-0.5">
                Enable live visibility for first responders dispatched to your emergency.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                id="shareWithRespondersToggle"
                type="checkbox"
                checked={formData.shareWithResponders}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    shareWithResponders: e.target.checked,
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Privacy Note */}
          <div className="flex items-start gap-2 pt-2 border-t border-gray-200/80 text-[11px] text-gray-600">
            <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Privacy Guarantee:</strong> Your medical information is encrypted and private. It is only accessible to the single verified first responder actively assigned to your emergency while in Accepted or In-Progress status. Once the incident is resolved or cancelled, access is immediately revoked. You can toggle this off at any time.
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            className="w-fit font-bold"
          >
            Save Medical Info
          </Button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Remove All Medical Information"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs sm:text-sm text-appText-secondary">
            Are you sure you want to completely erase your saved medical info? First responders will not have access to any emergency health history.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="emergency"
              size="sm"
              loading={saving}
              onClick={handleClear}
            >
              Yes, Delete Everything
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MedicalInfoSection;
