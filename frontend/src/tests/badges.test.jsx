import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SeverityBadge from '../components/common/SeverityBadge.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import { SEVERITIES } from '../constants/severities.js';
import { STATUSES } from '../constants/statuses.js';

describe('Frontend Component Tests: Badges', () => {
  describe('SeverityBadge', () => {
    it('should render LOW severity with appropriate label', () => {
      render(<SeverityBadge severity={SEVERITIES.LOW} />);
      expect(screen.getByText('LOW')).toBeInTheDocument();
    });

    it('should render CRITICAL severity with pulsing animation classes', () => {
      const { container } = render(<SeverityBadge severity={SEVERITIES.CRITICAL} />);
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(container.firstChild).toHaveClass('animate-pulse');
    });

    it('should render HIGH and MEDIUM severities', () => {
      const { rerender } = render(<SeverityBadge severity={SEVERITIES.HIGH} />);
      expect(screen.getByText('HIGH')).toBeInTheDocument();

      rerender(<SeverityBadge severity={SEVERITIES.MEDIUM} />);
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });
  });

  describe('StatusBadge', () => {
    it('should render Pending status with human-friendly label', () => {
      render(<StatusBadge status={STATUSES.PENDING} />);
      expect(screen.getByText('Pending Dispatch')).toBeInTheDocument();
    });

    it('should render In Progress status correctly', () => {
      render(<StatusBadge status={STATUSES.IN_PROGRESS} />);
      expect(screen.getByText('In Progress / On Scene')).toBeInTheDocument();
    });

    it('should render Resolved status correctly', () => {
      render(<StatusBadge status={STATUSES.RESOLVED} />);
      expect(screen.getByText('Resolved')).toBeInTheDocument();
    });
  });
});
