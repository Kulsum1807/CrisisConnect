import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';

describe('Frontend Component Tests: Form Elements', () => {
  describe('Button', () => {
    it('should render children and respond to clicks', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Trigger SOS</Button>);

      const btn = screen.getByRole('button', { name: /trigger sos/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should show loading spinner and disable interaction when loading is true', () => {
      const handleClick = vi.fn();
      render(
        <Button loading={true} onClick={handleClick}>
          Submit Report
        </Button>
      );

      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Input', () => {
    it('should render label and input field with required indicator', () => {
      render(<Input label="Emergency Contact Phone" required />);
      expect(screen.getByText(/emergency contact phone/i)).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should display error message when error prop is provided', () => {
      render(
        <Input
          label="Email"
          error="Please provide a valid email"
          placeholder="test@example.com"
        />
      );
      expect(screen.getByText('Please provide a valid email')).toBeInTheDocument();
    });
  });
});
