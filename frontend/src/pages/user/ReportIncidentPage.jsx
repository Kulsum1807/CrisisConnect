import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES, CATEGORY_LABELS } from '../../constants/categories.js';
import incidentService from '../../services/incidentService.js';
import { getErrorMessage } from '../../services/api.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import LocationPicker from '../../components/map/LocationPicker.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ReportIncidentPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    category: CATEGORIES.MEDICAL,
    description: '',
    address: '',
  });

  const [checklist, setChecklist] = useState({
    conscious: true,
    breathing: true,
    severeBleeding: false,
    inDangerNow: false,
    injuries: false,
  });

  const [coords, setCoords] = useState(null);
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDetectGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser');
      return;
    }

    setDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setDetectingGps(false);
        showToast('GPS coordinates acquired successfully', 'success');
      },
      (err) => {
        setGpsError('Location access was denied or timed out. Please enter an address.');
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleChecklistChange = (field, val) => {
    setChecklist((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category || !formData.description.trim()) {
      setError('Please provide an emergency category and detailed description');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        isSOS: false,
        category: formData.category,
        description: formData.description.trim(),
        address: formData.address.trim(),
        checklist,
        location: coords,
        locationAvailable: Boolean(coords),
      };

      const incident = await incidentService.createIncident(payload);
      showToast('Incident report submitted successfully', 'success');
      navigate(`/user/incidents/${incident._id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = Object.entries(CATEGORIES).map(([key, val]) => ({
    value: val,
    label: CATEGORY_LABELS[val] || val,
  }));

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-appText-primary font-display">
          Report an Emergency Incident
        </h1>
        <p className="text-xs sm:text-sm text-appText-secondary mt-1">
          Provide situational details to ensure first responders deploy with the correct emergency equipment.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-emergency font-medium flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-surface p-5 sm:p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-6">
        {/* Category */}
        <Select
          label="Emergency Category"
          value={formData.category}
          onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
          options={categoryOptions}
          required
        />

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-appText-secondary uppercase tracking-wider flex items-center gap-1">
            Detailed Description <span className="text-emergency">*</span>
          </label>
          <textarea
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what happened, number of people affected, visible hazards, landmarks, etc."
            className="w-full px-3.5 py-2.5 bg-surface border border-gray-300 rounded-lg text-sm text-appText-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        {/* Clinical / Situational Triage Checklist */}
        <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Quick Triage Assessment (Assists Severity Level)
          </span>

          <div className="space-y-2.5">
            <label className="flex items-center justify-between text-xs sm:text-sm text-appText-primary cursor-pointer">
              <span>Is the individual conscious?</span>
              <input
                type="checkbox"
                checked={checklist.conscious}
                onChange={(e) => handleChecklistChange('conscious', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
            </label>

            <label className="flex items-center justify-between text-xs sm:text-sm text-appText-primary cursor-pointer">
              <span>Is the individual breathing normally?</span>
              <input
                type="checkbox"
                checked={checklist.breathing}
                onChange={(e) => handleChecklistChange('breathing', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
            </label>

            <label className="flex items-center justify-between text-xs sm:text-sm text-appText-primary cursor-pointer">
              <span>Is there severe bleeding / hemorrhage?</span>
              <input
                type="checkbox"
                checked={checklist.severeBleeding}
                onChange={(e) => handleChecklistChange('severeBleeding', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
            </label>

            <label className="flex items-center justify-between text-xs sm:text-sm text-appText-primary cursor-pointer">
              <span>Are there visible traumatic injuries / fractures?</span>
              <input
                type="checkbox"
                checked={checklist.injuries}
                onChange={(e) => handleChecklistChange('injuries', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
            </label>

            <label className="flex items-center justify-between text-xs sm:text-sm text-appText-primary cursor-pointer">
              <span>Is anyone in immediate physical danger?</span>
              <input
                type="checkbox"
                checked={checklist.inDangerNow}
                onChange={(e) => handleChecklistChange('inDangerNow', e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
            </label>
          </div>
        </div>

        {/* Location Section */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-appText-secondary uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emergency" />
            Incident Location & Address
          </label>
          <LocationPicker
            value={coords}
            address={formData.address}
            onChange={(loc) => {
              if (loc.lat && loc.lng) {
                setCoords({ lat: loc.lat, lng: loc.lng });
              }
              if (loc.address !== undefined) {
                setFormData((prev) => ({ ...prev, address: loc.address }));
              }
            }}
            onAddressChange={(addr) => {
              setFormData((prev) => ({ ...prev, address: addr }));
            }}
            height="260px"
          />
        </div>

        <Button
          type="submit"
          variant="emergency"
          size="lg"
          loading={loading}
          className="w-full mt-2 font-bold shadow-md"
        >
          Submit Emergency Report
        </Button>
      </form>
    </div>
  );
};

export default ReportIncidentPage;
