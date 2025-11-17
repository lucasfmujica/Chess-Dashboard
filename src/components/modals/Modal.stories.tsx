import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Modal from './Modal';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Modal>;

// Wrapper component to handle state for interactive stories
const InteractiveModal = ({ type }: { type: 'alert' | 'confirm' | 'prompt' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState('');

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const handleConfirm = (value?: string) => {
    if (type === 'prompt') {
      setResult(`User entered: ${value}`);
    } else {
      setResult(type === 'confirm' ? 'User confirmed' : 'User acknowledged');
    }
    handleClose();
  };

  const handleCancel = () => {
    setResult('User cancelled');
    handleClose();
  };

  return (
    <div className="p-8">
      <button
        onClick={handleOpen}
        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
      >
        Open {type.charAt(0).toUpperCase() + type.slice(1)} Modal
      </button>
      {result && (
        <p className="mt-4 p-4 bg-blue-50 rounded-lg text-sm">{result}</p>
      )}
      <Modal
        isOpen={isOpen}
        type={type}
        title={type === 'alert' ? 'Notice' : type === 'confirm' ? 'Confirm Action' : 'Enter Value'}
        message={
          type === 'alert'
            ? 'This is an informational message.'
            : type === 'confirm'
            ? 'Are you sure you want to proceed with this action?'
            : 'Please enter your response below:'
        }
        defaultValue={type === 'prompt' ? 'Default value' : undefined}
        onConfirm={handleConfirm}
        onCancel={type !== 'alert' ? handleCancel : undefined}
      />
    </div>
  );
};

export const Alert: Story = {
  render: () => <InteractiveModal type="alert" />,
};

export const Confirm: Story = {
  render: () => <InteractiveModal type="confirm" />,
};

export const Prompt: Story = {
  render: () => <InteractiveModal type="prompt" />,
};

// Static examples for visual testing
export const AlertOpen: Story = {
  args: {
    isOpen: true,
    type: 'alert',
    title: 'Success!',
    message: 'Your changes have been saved successfully.',
    onConfirm: () => console.log('Confirmed'),
  },
};

export const ConfirmDelete: Story = {
  args: {
    isOpen: true,
    type: 'confirm',
    title: 'Delete Game',
    message: 'Are you sure you want to delete this game? This action cannot be undone.',
    onConfirm: () => console.log('Confirmed'),
    onCancel: () => console.log('Cancelled'),
  },
};

export const PromptForName: Story = {
  args: {
    isOpen: true,
    type: 'prompt',
    title: 'Enter Player Name',
    message: 'Please enter the player name as it appears in the PGN file:',
    defaultValue: 'John Doe',
    onConfirm: (value) => console.log('Value:', value),
    onCancel: () => console.log('Cancelled'),
  },
};
