import React, { useState, useEffect, useCallback, useRef } from 'react';

type ModalType = 'alert' | 'confirm' | 'prompt';

interface ModalProps {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  defaultValue?: string;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  type,
  title,
  message,
  defaultValue = '',
  onConfirm,
  onCancel
}) => {
  const [inputValue, setInputValue] = useState<string>(defaultValue || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setInputValue(defaultValue || '');
  }, [defaultValue, isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Focus input for prompt, otherwise focus confirm button
      if (type === 'prompt' && inputRef.current) {
        inputRef.current.focus();
      } else if (confirmButtonRef.current) {
        confirmButtonRef.current.focus();
      }
    }
  }, [isOpen, type]);

  const handleConfirm = useCallback(() => {
    if (type === 'prompt') {
      onConfirm?.(inputValue);
    } else {
      onConfirm?.();
    }
  }, [type, inputValue, onConfirm]);

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && type === 'alert') {
        handleConfirm();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleEnter);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleEnter);
    };
  }, [isOpen, type, handleConfirm, handleCancel]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleConfirm();
  };

  const getIcon = () => {
    switch (type) {
      case 'alert':
        return (
          <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-full">
            <svg
              className="w-6 h-6 text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
      case 'confirm':
        return (
          <div className="p-3 bg-yellow-100 dark:bg-yellow-500/20 rounded-full">
            <svg
              className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        );
      case 'prompt':
        return (
          <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-full">
            <svg
              className="w-6 h-6 text-emerald-600 dark:text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={type === 'alert' ? handleConfirm : handleCancel}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-surface rounded-lg border border-hairline shadow-xl max-w-md w-full transform transition-all">
          {/* Header */}
          <div className="p-6 pb-4">
            <div className="flex items-start gap-4">
              {getIcon()}
              <div className="flex-1">
                <h3
                  id="modal-title"
                  className="text-lg font-semibold text-fg"
                >
                  {title}
                </h3>
              </div>
              {type !== 'alert' && (
                <button
                  onClick={handleCancel}
                  className="p-1 rounded-lg hover:bg-surface-2 transition-colors"
                  aria-label="Close modal"
                >
                  <svg
                    className="w-5 h-5 text-fg-subtle"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 pb-6">
              <p
                id="modal-description"
                className="text-fg-muted text-sm whitespace-pre-wrap"
              >
                {message}
              </p>

              {type === 'prompt' && (
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="mt-4 w-full px-4 py-2 bg-surface border border-hairline text-fg rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  aria-label="Input field"
                />
              )}
            </div>

            {/* Actions */}
            <div className="bg-surface-2 px-6 py-4 rounded-b-2xl flex gap-3 justify-end">
              {type === 'confirm' && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-semibold text-fg-muted bg-surface border border-hairline rounded-lg hover:bg-surface-2 transition-colors"
                  aria-label="Cancel"
                >
                  Cancel
                </button>
              )}
              {type === 'prompt' && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-semibold text-fg-muted bg-surface border border-hairline rounded-lg hover:bg-surface-2 transition-colors"
                  aria-label="Cancel"
                >
                  Cancel
                </button>
              )}
              <button
                ref={confirmButtonRef}
                type={type === 'prompt' ? 'submit' : 'button'}
                onClick={type === 'prompt' ? undefined : handleConfirm}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all ${
                  type === 'confirm'
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:shadow-lg'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg'
                }`}
                aria-label={type === 'confirm' ? 'Confirm' : 'OK'}
              >
                {type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Modal;
