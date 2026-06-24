import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Modal from './Modal';

describe('Modal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Alert Modal', () => {
    it('should render alert modal when open', () => {
      render(
        <Modal
          isOpen={true}
          type="alert"
          title="Test Alert"
          message="This is a test message"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('Test Alert')).toBeInTheDocument();
      expect(screen.getByText('This is a test message')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <Modal
          isOpen={false}
          type="alert"
          title="Test Alert"
          message="This is a test message"
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.queryByText('Test Alert')).not.toBeInTheDocument();
    });

    it('should call onConfirm when OK button is clicked', () => {
      render(
        <Modal
          isOpen={true}
          type="alert"
          title="Test Alert"
          message="This is a test message"
          onConfirm={mockOnConfirm}
        />
      );

      const okButton = screen.getByRole('button', { name: /ok/i });
      fireEvent.click(okButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Confirm Modal', () => {
    it('should render confirm modal with cancel and confirm buttons', () => {
      render(
        <Modal
          isOpen={true}
          type="confirm"
          title="Test Confirm"
          message="Are you sure?"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Test Confirm')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });

    it('should call onConfirm when confirm button is clicked', () => {
      render(
        <Modal
          isOpen={true}
          type="confirm"
          title="Test Confirm"
          message="Are you sure?"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('should call onCancel when cancel button is clicked', () => {
      render(
        <Modal
          isOpen={true}
          type="confirm"
          title="Test Confirm"
          message="Are you sure?"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Prompt Modal', () => {
    it('should render prompt modal with input field', () => {
      render(
        <Modal
          isOpen={true}
          type="prompt"
          title="Test Prompt"
          message="Enter your name"
          defaultValue="John"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Test Prompt')).toBeInTheDocument();
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('John');
    });

    it('should call onConfirm with input value when OK is clicked', () => {
      render(
        <Modal
          isOpen={true}
          type="prompt"
          title="Test Prompt"
          message="Enter your name"
          defaultValue=""
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Jane Doe' } });

      const okButton = screen.getByRole('button', { name: /ok/i });
      fireEvent.click(okButton);

      expect(mockOnConfirm).toHaveBeenCalledWith('Jane Doe');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <Modal
          isOpen={true}
          type="alert"
          title="Test Alert"
          message="Test message"
          onConfirm={mockOnConfirm}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'modal-description');
    });
  });
});
