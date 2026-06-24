import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModalProvider, useModal } from './ModalContext';

// Test component that uses the modal context
const TestComponent = () => {
  const modal = useModal();

  const handleAlert = async () => {
    await modal.alert('Test alert message', 'Alert Title');
  };

  const handleConfirm = async () => {
    const result = await modal.confirm('Are you sure?', 'Confirm Title');
    document.getElementById('confirm-result').textContent = result ? 'Confirmed' : 'Cancelled';
  };

  const handlePrompt = async () => {
    const result = await modal.prompt('Enter value:', 'default', 'Prompt Title');
    document.getElementById('prompt-result').textContent = result || 'Cancelled';
  };

  return (
    <div>
      <button onClick={handleAlert}>Show Alert</button>
      <button onClick={handleConfirm}>Show Confirm</button>
      <button onClick={handlePrompt}>Show Prompt</button>
      <div id="confirm-result"></div>
      <div id="prompt-result"></div>
    </div>
  );
};

describe('ModalContext', () => {
  it('should throw error when useModal is used outside provider', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useModal must be used within a ModalProvider');

    spy.mockRestore();
  });

  it('should render alert modal when alert is called', async () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );

    const alertButton = screen.getByText('Show Alert');
    fireEvent.click(alertButton);

    await waitFor(() => {
      expect(screen.getByText('Alert Title')).toBeInTheDocument();
      expect(screen.getByText('Test alert message')).toBeInTheDocument();
    });
  });

  it('should render confirm modal when confirm is called', async () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );

    const confirmButton = screen.getByText('Show Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm Title')).toBeInTheDocument();
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });
  });

  it('should render prompt modal when prompt is called', async () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );

    const promptButton = screen.getByText('Show Prompt');
    fireEvent.click(promptButton);

    await waitFor(() => {
      expect(screen.getByText('Prompt Title')).toBeInTheDocument();
      expect(screen.getByText('Enter value:')).toBeInTheDocument();
    });
  });

  it('should resolve confirm with true when confirmed', async () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );

    const confirmButton = screen.getByText('Show Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm Title')).toBeInTheDocument();
    });

    const modalConfirmButton = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(modalConfirmButton);

    await waitFor(() => {
      const result = document.getElementById('confirm-result');
      expect(result.textContent).toBe('Confirmed');
    });
  });

  it('should resolve confirm with false when cancelled', async () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );

    const confirmButton = screen.getByText('Show Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm Title')).toBeInTheDocument();
    });

    const modalCancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(modalCancelButton);

    await waitFor(() => {
      const result = document.getElementById('confirm-result');
      expect(result.textContent).toBe('Cancelled');
    });
  });
});
