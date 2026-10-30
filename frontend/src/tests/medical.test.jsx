import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MedicalInfoSection from '../components/user/MedicalInfoSection.jsx';
import MedicalInfoCard from '../components/incident/MedicalInfoCard.jsx';
import * as useMedicalInfoModule from '../hooks/useMedicalInfo.js';
import { STATUSES } from '../constants/statuses.js';

// Mock Toast context
const mockShowToast = vi.fn();
vi.mock('../components/common/Toast.jsx', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

describe('Frontend Medical Info Feature Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MedicalInfoSection Component (Citizen Profile)', () => {
    const mockSave = vi.fn().mockResolvedValue({});
    const mockClear = vi.fn().mockResolvedValue({});

    beforeEach(() => {
      vi.spyOn(useMedicalInfoModule, 'useMyMedicalInfo').mockReturnValue({
        medicalInfo: {
          bloodGroup: 'O+',
          allergies: ['Penicillin'],
          conditions: ['Asthma'],
          medications: ['Albuterol'],
          notes: 'Keep inhaler accessible.',
          shareWithResponders: true,
        },
        loading: false,
        saving: false,
        error: null,
        saveMedicalInfo: mockSave,
        clearMedicalInfo: mockClear,
        refetch: vi.fn(),
      });
    });

    it('renders blood group select, pre-existing values, and privacy elements', () => {
      render(
        <BrowserRouter>
          <MedicalInfoSection />
        </BrowserRouter>
      );

      // Header & Private health data badge
      expect(screen.getByText(/Medical Info Card/i)).toBeInTheDocument();
      expect(screen.getByText(/Private Health Data/i)).toBeInTheDocument();

      // Blood group select
      const select = screen.getByLabelText(/Blood Group/i);
      expect(select).toBeInTheDocument();
      expect(select.value).toBe('O+');

      // Tags rendered
      expect(screen.getByText('Penicillin')).toBeInTheDocument();
      expect(screen.getByText('Asthma')).toBeInTheDocument();
      expect(screen.getByText('Albuterol')).toBeInTheDocument();

      // Notes
      expect(screen.getByDisplayValue('Keep inhaler accessible.')).toBeInTheDocument();

      // Switch
      const switchToggle = screen.getByLabelText(
        /Share with the responder assigned to my incident/i
      );
      expect(switchToggle).toBeInTheDocument();
      expect(switchToggle.checked).toBe(true);

      // Privacy note
      expect(screen.getByText(/Privacy Guarantee:/i)).toBeInTheDocument();
      expect(
        screen.getByText(/It is only accessible to the single verified first responder actively assigned to your emergency/i)
      ).toBeInTheDocument();
    });

    it('allows adding a new allergy tag and submitting the form', async () => {
      render(
        <BrowserRouter>
          <MedicalInfoSection />
        </BrowserRouter>
      );

      // Add a new allergy tag
      const allergyInput = screen.getByPlaceholderText(/e\.g\. Penicillin, Peanuts, Latex\.\.\./i);
      fireEvent.change(allergyInput, { target: { value: 'Peanuts' } });
      fireEvent.keyDown(allergyInput, { key: 'Enter', code: 'Enter' });

      // Tag should now be visible
      expect(screen.getByText('Peanuts')).toBeInTheDocument();

      // Save form
      const saveBtn = screen.getByRole('button', { name: /Save Medical Info/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(mockSave).toHaveBeenCalledWith(
          expect.objectContaining({
            bloodGroup: 'O+',
            allergies: ['Penicillin', 'Peanuts'],
            shareWithResponders: true,
          })
        );
      });
    });

    it('allows toggling off shareWithResponders switch', async () => {
      render(
        <BrowserRouter>
          <MedicalInfoSection />
        </BrowserRouter>
      );

      const switchToggle = screen.getByLabelText(
        /Share with the responder assigned to my incident/i
      );
      expect(switchToggle.checked).toBe(true);

      fireEvent.click(switchToggle);
      expect(switchToggle.checked).toBe(false);

      const saveBtn = screen.getByRole('button', { name: /Save Medical Info/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledWith(
          expect.objectContaining({
            shareWithResponders: false,
          })
        );
      });
    });
  });

  describe('MedicalInfoCard Component (Responder Incident Details)', () => {
    it('is completely hidden when incident is RESOLVED', () => {
      const { container } = render(
        <MedicalInfoCard incidentId="inc-123" incidentStatus={STATUSES.RESOLVED} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('is completely hidden when incident is CANCELLED or REJECTED', () => {
      const { container: c1 } = render(
        <MedicalInfoCard incidentId="inc-123" incidentStatus={STATUSES.CANCELLED} />
      );
      expect(c1.firstChild).toBeNull();

      const { container: c2 } = render(
        <MedicalInfoCard incidentId="inc-123" incidentStatus={STATUSES.REJECTED} />
      );
      expect(c2.firstChild).toBeNull();
    });

    it('shows small lock note when endpoint returns null / no shared data', () => {
      vi.spyOn(useMedicalInfoModule, 'useIncidentMedicalInfo').mockReturnValue({
        medicalInfo: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MedicalInfoCard incidentId="inc-123" incidentStatus={STATUSES.ACCEPTED} />
      );

      expect(
        screen.getByText('The user has not shared medical info')
      ).toBeInTheDocument();
      expect(screen.queryByText(/Patient Medical Info Card/i)).not.toBeInTheDocument();
    });

    it('renders full patient medical vitals when endpoint returns data', () => {
      vi.spyOn(useMedicalInfoModule, 'useIncidentMedicalInfo').mockReturnValue({
        medicalInfo: {
          bloodGroup: 'B+',
          allergies: ['Morphine', 'Latex'],
          conditions: ['Hypertension', 'Type 2 Diabetes'],
          medications: ['Lisinopril', 'Metformin'],
          notes: 'Patient carries glucometer in right jacket pocket.',
          shareWithResponders: true,
        },
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <MedicalInfoCard incidentId="inc-123" incidentStatus={STATUSES.IN_PROGRESS} />
      );

      // Card header & citizen shared badge
      expect(screen.getByText('Patient Medical Info Card')).toBeInTheDocument();
      expect(screen.getByText('Citizen Shared')).toBeInTheDocument();

      // Blood group
      expect(screen.getByText('B+')).toBeInTheDocument();

      // Allergies
      expect(screen.getByText('Morphine')).toBeInTheDocument();
      expect(screen.getByText('Latex')).toBeInTheDocument();

      // Conditions
      expect(screen.getByText('Hypertension')).toBeInTheDocument();
      expect(screen.getByText('Type 2 Diabetes')).toBeInTheDocument();

      // Medications
      expect(screen.getByText('Lisinopril')).toBeInTheDocument();
      expect(screen.getByText('Metformin')).toBeInTheDocument();

      // Directives
      expect(
        screen.getByText('Patient carries glucometer in right jacket pocket.')
      ).toBeInTheDocument();
    });
  });
});
