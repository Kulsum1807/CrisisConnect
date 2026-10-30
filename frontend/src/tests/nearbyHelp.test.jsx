import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NearbyHelpList from '../components/places/NearbyHelpList.jsx';
import IncidentMap from '../components/map/IncidentMap.jsx';
import NearbyHelpPage from '../pages/NearbyHelpPage.jsx';
import * as useNearbyPlacesModule from '../hooks/useNearbyPlaces.js';
import * as useGeolocationModule from '../hooks/useGeolocation.js';

describe('Frontend Nearby Help Feature Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPlaces = [
    {
      id: 'hosp-1',
      type: 'hospital',
      name: 'Victoria Memorial Hospital',
      lat: 12.972,
      lng: 77.595,
      phone: '+91-80-26701123',
      distanceMeters: 450,
    },
    {
      id: 'pol-1',
      type: 'police',
      name: 'Cubbon Park Police Station',
      lat: 12.977,
      lng: 77.598,
      phone: null, // Test missing phone
      distanceMeters: 1200,
    },
  ];

  describe('NearbyHelpList Component', () => {
    it('renders emergency notice, Call 112 button, and OpenStreetMap attribution', () => {
      render(
        <BrowserRouter>
          <NearbyHelpList places={mockPlaces} loading={false} error={null} />
        </BrowserRouter>
      );

      // 1. Notice
      expect(
        screen.getByText(/In a real emergency call 112 immediately\./i)
      ).toBeInTheDocument();

      // 2. Call 112 button
      const call112Btn = screen.getByRole('link', { name: /Call 112/i });
      expect(call112Btn).toBeInTheDocument();
      expect(call112Btn).toHaveAttribute('href', 'tel:112');

      // 3. Attribution
      expect(screen.getByText(/OpenStreetMap contributors/i)).toBeInTheDocument();
    });

    it('displays facilities with icons and explicit text labels (not color alone)', () => {
      render(
        <BrowserRouter>
          <NearbyHelpList places={mockPlaces} loading={false} error={null} />
        </BrowserRouter>
      );

      // Hospital item with explicit "Hospital" text label
      expect(screen.getByText('Victoria Memorial Hospital')).toBeInTheDocument();
      expect(screen.getByText('Hospital')).toBeInTheDocument();
      expect(screen.getByText('0.5 km')).toBeInTheDocument();

      // Police item with explicit "Police Station" text label
      expect(screen.getByText('Cubbon Park Police Station')).toBeInTheDocument();
      expect(screen.getByText('Police Station')).toBeInTheDocument();
      expect(screen.getByText('1.2 km')).toBeInTheDocument();
    });

    it('renders Directions link for all and Call link ONLY when phone exists', () => {
      render(
        <BrowserRouter>
          <NearbyHelpList places={mockPlaces} loading={false} error={null} />
        </BrowserRouter>
      );

      // Directions links
      const directionsLinks = screen.getAllByRole('link', { name: /Directions/i });
      expect(directionsLinks).toHaveLength(2);
      expect(directionsLinks[0]).toHaveAttribute(
        'href',
        'https://www.google.com/maps/dir/?api=1&destination=12.972,77.595'
      );
      expect(directionsLinks[1]).toHaveAttribute(
        'href',
        'https://www.google.com/maps/dir/?api=1&destination=12.977,77.598'
      );

      // Call links (only Victoria Hospital has a phone)
      const callLinks = screen.getAllByRole('link', { name: /Call/i });
      // 1 for Call 112, 1 for Victoria Hospital = 2 total
      const placeCallLinks = callLinks.filter(
        (link) => link.getAttribute('href') !== 'tel:112'
      );
      expect(placeCallLinks).toHaveLength(1);
      expect(placeCallLinks[0]).toHaveAttribute('href', 'tel:+91-80-26701123');
    });

    it('renders error state without crashing the component', () => {
      render(
        <BrowserRouter>
          <NearbyHelpList
            places={[]}
            loading={false}
            error="Overpass API temporarily unavailable."
          />
        </BrowserRouter>
      );

      expect(
        screen.getByText('Overpass API temporarily unavailable.')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Please dial emergency dispatch 112/i)
      ).toBeInTheDocument();
    });

    it('renders empty state when no facilities found', () => {
      render(
        <BrowserRouter>
          <NearbyHelpList places={[]} loading={false} error={null} />
        </BrowserRouter>
      );

      expect(screen.getByText(/No nearby facilities found/i)).toBeInTheDocument();
    });
  });

  describe('IncidentMap Nearby Help Integration', () => {
    it('allows toggling Nearby Help on the incident map', () => {
      vi.spyOn(useNearbyPlacesModule, 'default').mockReturnValue({
        places: mockPlaces,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <BrowserRouter>
          <IncidentMap
            incidentLocation={{ lat: 12.9716, lng: 77.5946 }}
            severity="CRITICAL"
            category="MEDICAL"
          />
        </BrowserRouter>
      );

      // Initially closed
      const toggleBtn = screen.getByRole('button', { name: /Show Nearby Help/i });
      expect(toggleBtn).toBeInTheDocument();
      expect(screen.queryByTestId('nearby-places-list')).not.toBeInTheDocument();

      // Click to toggle on
      fireEvent.click(toggleBtn);

      // Toggle text changes and list view appears
      expect(screen.getByRole('button', { name: /Hide Nearby Help/i })).toBeInTheDocument();
      expect(screen.getByTestId('nearby-places-list')).toBeInTheDocument();
      expect(screen.getByText('Victoria Memorial Hospital')).toBeInTheDocument();
    });
  });

  describe('NearbyHelpPage Component (Standalone)', () => {
    it('renders standalone directory page with map and facility cards', () => {
      vi.spyOn(useGeolocationModule, 'default').mockReturnValue({
        coords: { lat: 12.9716, lng: 77.5946 },
        loading: false,
        error: null,
        detectLocation: vi.fn(),
      });

      vi.spyOn(useNearbyPlacesModule, 'default').mockReturnValue({
        places: mockPlaces,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <BrowserRouter>
          <NearbyHelpPage />
        </BrowserRouter>
      );

      expect(screen.getByRole('heading', { name: 'Nearby Help' })).toBeInTheDocument();
      expect(screen.getByTestId('nearby-help-map')).toBeInTheDocument();
      expect(screen.getByText('Discovered Facilities')).toBeInTheDocument();
      expect(screen.getByText('Victoria Memorial Hospital')).toBeInTheDocument();
      expect(screen.getByText('Cubbon Park Police Station')).toBeInTheDocument();
    });
  });
});
