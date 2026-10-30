import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  Star,
  Trash2,
  Edit3,
  Shield,
  HeartHandshake,
} from 'lucide-react';
import useEmergencyContacts from '../../hooks/useEmergencyContacts.js';
import {
  RELATIONSHIPS,
  RELATIONSHIP_LABELS,
} from '../../constants/contacts.js';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import Select from '../common/Select.jsx';
import Modal from '../common/Modal.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { useToast } from '../common/Toast.jsx';

const initialFormState = {
  name: '',
  phone: '',
  relationship: RELATIONSHIPS.FAMILY,
  email: '',
  isPrimary: false,
};

export const EmergencyContactsSection = () => {
  const {
    contacts,
    loading,
    canAddMore,
    addContact,
    updateContact,
    deleteContact,
  } = useEmergencyContacts();

  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  // Delete dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const relationshipOptions = [
    { value: RELATIONSHIPS.FAMILY, label: RELATIONSHIP_LABELS.FAMILY },
    { value: RELATIONSHIPS.FRIEND, label: RELATIONSHIP_LABELS.FRIEND },
    { value: RELATIONSHIPS.COLLEAGUE, label: RELATIONSHIP_LABELS.COLLEAGUE },
    { value: RELATIONSHIPS.OTHER, label: RELATIONSHIP_LABELS.OTHER },
  ];

  const handleOpenAddModal = () => {
    if (!canAddMore) {
      showToast('Maximum of 5 emergency contacts reached', 'error');
      return;
    }
    setEditingContact(null);
    setFormData({
      ...initialFormState,
      isPrimary: contacts.length === 0, // Auto-select primary if first contact
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      email: contact.email || '',
      isPrimary: Boolean(contact.isPrimary),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenDeleteConfirm = (contact) => {
    setContactToDelete(contact);
    setDeleteConfirmOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    const trimmedName = formData.name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 60) {
      setFormError('Contact name must be between 2 and 60 characters');
      return;
    }

    const trimmedPhone = formData.phone.trim();
    const phoneRegex = /^\+?\d{10,15}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      setFormError('Phone number must be 10-15 digits (optional leading +)');
      return;
    }

    const trimmedEmail = formData.email.trim();
    if (trimmedEmail) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setFormError('Please enter a valid email address');
        return;
      }
    }

    setFormLoading(true);
    try {
      const payload = {
        name: trimmedName,
        phone: trimmedPhone,
        relationship: formData.relationship,
        email: trimmedEmail || undefined,
        isPrimary: formData.isPrimary,
      };

      if (editingContact) {
        await updateContact(editingContact._id, payload);
        showToast('Emergency contact updated successfully', 'success');
      } else {
        await addContact(payload);
        showToast('Emergency contact added successfully', 'success');
      }

      setModalOpen(false);
      setEditingContact(null);
      setFormData(initialFormState);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!contactToDelete) return;
    setDeleting(true);
    try {
      await deleteContact(contactToDelete._id);
      showToast('Emergency contact deleted successfully', 'success');
      setDeleteConfirmOpen(false);
      setContactToDelete(null);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-appText-primary font-display">
                Emergency Contacts
              </h2>
              <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full font-semibold">
                {contacts.length}/5
              </span>
            </div>
            <p className="text-xs text-appText-secondary">
              Trusted individuals to notify during emergencies. Max 5 contacts.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenAddModal}
          disabled={!canAddMore}
          className="text-xs self-start sm:self-center"
        >
          <UserPlus className="w-3.5 h-3.5 mr-1.5" />
          Add Contact
        </Button>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        /* Empty State */
        <EmptyState
          icon={Users}
          title="No emergency contacts configured"
          message="Add trusted family, friends, or colleagues who can be contacted immediately in an emergency."
          actionText="Add First Emergency Contact"
          onAction={handleOpenAddModal}
        />
      ) : (
        /* Contact List */
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div
              key={contact._id}
              className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                contact.isPrimary
                  ? 'bg-amber-50/40 border-amber-200/80 shadow-xs'
                  : 'bg-white border-gray-200/80 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    contact.isPrimary
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {contact.name.charAt(0).toUpperCase()}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-appText-primary">
                      {contact.name}
                    </span>
                    <span className="text-[11px] font-medium text-appText-secondary bg-gray-100 px-2 py-0.5 rounded-md">
                      {RELATIONSHIP_LABELS[contact.relationship] ||
                        contact.relationship}
                    </span>
                    {contact.isPrimary && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        Primary Contact
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-appText-secondary flex-wrap">
                    <a
                      href={`tel:${contact.phone}`}
                      className="inline-flex items-center gap-1 hover:text-primary transition-colors font-medium"
                    >
                      <Phone className="w-3 h-3 text-emerald-600" />
                      {contact.phone}
                    </a>
                    {contact.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {contact.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEditModal(contact)}
                  className="text-xs p-2 text-gray-600 hover:text-primary"
                  title="Edit Contact"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenDeleteConfirm(contact)}
                  className="text-xs p-2 text-gray-400 hover:text-emergency hover:bg-red-50"
                  title="Delete Contact"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'
        }
      >
        <form onSubmit={handleSubmitForm} className="flex flex-col gap-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-emergency font-medium">
              {formError}
            </div>
          )}

          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="e.g. John Doe"
            required
          />

          <Input
            label="Phone Number"
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, phone: e.target.value }))
            }
            placeholder="+919876543210 or 10-15 digits"
            helperText="Include country code (e.g. +91) or standard phone digits"
            required
          />

          <Select
            label="Relationship"
            value={formData.relationship}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, relationship: e.target.value }))
            }
            options={relationshipOptions}
            required
          />

          <Input
            label="Email Address (Optional)"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="e.g. contact@example.com"
          />

          <label className="flex items-center gap-2.5 pt-1 text-xs text-appText-primary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.isPrimary}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isPrimary: e.target.checked }))
              }
              className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300"
            />
            <span className="font-semibold">
              Set as Primary Contact (clears any existing primary)
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={formLoading}
            >
              {editingContact ? 'Save Changes' : 'Add Contact'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Remove Emergency Contact"
        message={`Are you sure you want to remove "${contactToDelete?.name}" from your emergency contacts? They will no longer receive emergency notifications.`}
        confirmText="Remove Contact"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  );
};

export default EmergencyContactsSection;
