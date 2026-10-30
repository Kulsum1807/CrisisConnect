import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { getErrorMessage } from '../../services/api.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import { HeartPulse, CheckSquare } from 'lucide-react';

const SPECIALIZATIONS = [
  'MEDICAL',
  'FIRE',
  'TRAUMA_CARE',
  'SEARCH_AND_RESCUE',
  'DISASTER_RESPONSE',
  'SECURITY',
];

export const RegisterResponderPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    responderType: 'PROFESSIONAL',
    organisation: '',
    referenceContact: '',
    verificationNote: '',
  });
  const [selectedSpecializations, setSelectedSpecializations] = useState(['MEDICAL']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { registerResponder } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleSpecialization = (spec) => {
    setSelectedSpecializations((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.password ||
      !formData.organisation ||
      !formData.referenceContact
    ) {
      setError('Please fill in all mandatory fields');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await registerResponder({
        ...formData,
        specialization: selectedSpecializations,
      });
      navigate('/responder/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-lg bg-surface p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-md mb-3">
            <HeartPulse className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-appText-primary font-display">
            Responder Volunteer Registration
          </h2>
          <p className="text-xs sm:text-sm text-appText-secondary mt-1">
            Join the verified responder network. Receive nearby emergency alerts and deliver life-saving first response.
          </p>
        </div>

        <div className="mb-5 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 leading-relaxed">
          <strong>Note:</strong> Responder accounts start in <strong>PENDING verification</strong> and remain <strong>OFFLINE</strong> until reviewed and verified by an administrator.
        </div>

        {error && (
          <div className="p-3 mb-5 rounded-lg bg-red-50 border border-red-200 text-xs sm:text-sm text-emergency font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Dr. Emily Watson"
            required
            autoComplete="name"
          />

          <Input
            label="Official / Work Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="responder@paramedics.org"
            required
            autoComplete="email"
          />

          <Input
            label="Direct Phone Number"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+91 9876543210"
            helperText="Used for direct operational communication during incidents."
            required
            autoComplete="tel"
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="At least 8 characters"
            required
            autoComplete="new-password"
          />

          {/* Responder Type Selection */}
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-xs font-semibold text-appText-secondary uppercase tracking-wider">
              Responder Type <span className="text-emergency">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                { label: 'Professional First Responder', value: 'PROFESSIONAL' },
                { label: 'Volunteer Responder', value: 'VOLUNTEER' },
              ].map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => setFormData((prev) => ({ ...prev, responderType: t.value }))}
                  className={`touch-target p-2.5 rounded-lg border text-xs text-left transition-colors font-medium ${
                    formData.responderType === t.value
                      ? 'bg-primary/10 border-primary text-primary font-bold'
                      : 'bg-surface border-gray-200 text-appText-secondary hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {formData.responderType === 'VOLUNTEER' && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1">
                Volunteer responders are dispatched and assigned by administrators for non-critical incidents.
              </p>
            )}
          </div>

          <Input
            label="Organisation / Agency Name"
            name="organisation"
            value={formData.organisation}
            onChange={handleChange}
            placeholder="e.g. City EMS Services, Red Cross, or Community Brigade"
            required
          />

          <Input
            label="Reference Contact Details"
            name="referenceContact"
            value={formData.referenceContact}
            onChange={handleChange}
            placeholder="Supervisor / Chief contact (name & phone or email)"
            helperText="Used by administrators during credential verification."
            required
          />

          {/* Specialization Selection */}
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-xs font-semibold text-appText-secondary uppercase tracking-wider">
              Emergency Specializations
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {SPECIALIZATIONS.map((spec) => {
                const isSelected = selectedSpecializations.includes(spec);
                return (
                  <button
                    type="button"
                    key={spec}
                    onClick={() => toggleSpecialization(spec)}
                    className={`touch-target flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium text-left transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-primary font-bold'
                        : 'bg-surface border-gray-200 text-appText-secondary hover:bg-gray-50'
                    }`}
                  >
                    <CheckSquare
                      className={`w-4 h-4 flex-shrink-0 ${
                        isSelected ? 'text-primary' : 'text-gray-300'
                      }`}
                    />
                    <span className="truncate">{spec.replace(/_/g, ' ')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-xs font-semibold text-appText-secondary uppercase tracking-wider">
              Verification Notes / Organization
            </label>
            <textarea
              name="verificationNote"
              value={formData.verificationNote}
              onChange={handleChange}
              rows={2}
              placeholder="State your credentials, certifications (e.g. BLS, CPR, Paramedic) or volunteer brigade."
              className="w-full px-3.5 py-2.5 bg-surface border border-gray-300 rounded-lg text-sm text-appText-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full mt-3 font-bold"
          >
            Submit Responder Application
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 text-center text-xs sm:text-sm text-appText-secondary">
          <p>
            Already an approved responder?{' '}
            <Link to="/login" className="font-bold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterResponderPage;
