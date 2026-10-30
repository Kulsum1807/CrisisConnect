import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import NotifyContactsCard from '../components/incident/NotifyContactsCard.jsx';
import EmergencyContactsSection from '../components/user/EmergencyContactsSection.jsx';
import * as useEmergencyContactsModule from '../hooks/useEmergencyContacts.js';
import { RELATIONSHIPS } from '../constants/contacts.js';

// Mock Toast context
vi.mock('../components/common/Toast.jsx', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

describe('Frontend Emergency Contacts Feature Tests', () => {
  const mockContacts = [
    {
      _id: 'c1',
      name: 'Alice Smith',
      phone: '+919876543210',
      relationship: RELATIONSHIPS.FAMILY,
      email: 'alice@example.com',
      isPrimary: true,
    },
    {
      _id: 'c2',
      name: 'Bob Jones',
      phone: '9876543211',
      relationship: RELATIONSHIPS.FRIEND,
      isPrimary: false,
    },
  ];

  describe('NotifyContactsCard Component', () => {
    it('generates correct Google Maps link when GPS coordinates are present', () => {
      vi.spyOn(useEmergencyContactsModule, 'default').mockReturnValue({
        contacts: mockContacts,
        loading: false,
        error: null,
      });

      const incidentWithGPS = {
        incidentNumber: 'INC-2026-0001',
        location: {
          type: 'Point',
          coordinates: [72.8777, 19.076], // [lng, lat]
        },
        address: 'Mumbai, India',
      };

      render(
        <BrowserRouter>
          <NotifyContactsCard incident={incidentWithGPS} />
        </BrowserRouter>
      );

      // Verify prefilled message contains https://www.google.com/maps?q=19.076,72.8777
      expect(screen.getByText(/I need help\. Incident INC-2026-0001\. My location: https:\/\/www\.google\.com\/maps\?q=19\.076,72\.8777/i)).toBeInTheDocument();

      // Verify action buttons for Alice
      const callButtons = screen.getAllByRole('link', { name: /call/i });
      expect(callButtons[0]).toHaveAttribute('href', 'tel:+919876543210');

      const smsButtons = screen.getAllByRole('link', { name: /sms/i });
      expect(smsButtons[0].getAttribute('href')).toContain('sms:+919876543210?body=');

      const waButtons = screen.getAllByRole('link', { name: /whatsapp/i });
      expect(waButtons[0].getAttribute('href')).toContain('https://wa.me/919876543210?text=');
    });

    it('falls back to address string when GPS coordinates are unavailable', () => {
      vi.spyOn(useEmergencyContactsModule, 'default').mockReturnValue({
        contacts: mockContacts,
        loading: false,
        error: null,
      });

      const incidentNoGPS = {
        incidentNumber: 'INC-2026-0002',
        address: '123 Marine Drive, Mumbai',
      };

      render(
        <BrowserRouter>
          <NotifyContactsCard incident={incidentNoGPS} />
        </BrowserRouter>
      );

      expect(screen.getByText(/I need help\. Incident INC-2026-0002\. My location: 123 Marine Drive, Mumbai/i)).toBeInTheDocument();
    });

    it('renders empty state when user has no contacts configured', () => {
      vi.spyOn(useEmergencyContactsModule, 'default').mockReturnValue({
        contacts: [],
        loading: false,
        error: null,
      });

      const incident = { incidentNumber: 'INC-2026-0003' };

      render(
        <BrowserRouter>
          <NotifyContactsCard incident={incident} />
        </BrowserRouter>
      );

      expect(screen.getByText(/No Emergency Contacts Configured/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Configure Emergency Contacts/i })).toHaveAttribute('href', '/user/profile');
    });
  });

  describe('EmergencyContactsSection Component', () => {
    it('renders list of contacts with primary badge and action buttons', () => {
      vi.spyOn(useEmergencyContactsModule, 'default').mockReturnValue({
        contacts: mockContacts,
        loading: false,
        canAddMore: true,
        addContact: vi.fn(),
        updateContact: vi.fn(),
        deleteContact: vi.fn(),
      });

      render(
        <BrowserRouter>
          <EmergencyContactsSection />
        </BrowserRouter>
      );

      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Primary Contact')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      expect(screen.getByText('2/5')).toBeInTheDocument();
    });

    it('renders empty state when there are no contacts', () => {
      vi.spyOn(useEmergencyContactsModule, 'default').mockReturnValue({
        contacts: [],
        loading: false,
        canAddMore: true,
        addContact: vi.fn(),
        updateContact: vi.fn(),
        deleteContact: vi.fn(),
      });

      render(
        <BrowserRouter>
          <EmergencyContactsSection />
        </BrowserRouter>
      );

      expect(screen.getByText(/No emergency contacts configured/i)).toBeInTheDocument();
    });
  });
});
