import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Modal from './Modal';

type ModalType = 'alert' | 'confirm' | 'prompt';

interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  defaultValue: string;
  onConfirm: ((value?: string) => void) | null;
  onCancel: (() => void) | null;
}

export interface ModalContextType {
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (message: string, title?: string) => Promise<boolean>;
  prompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
}

interface ModalProviderProps {
  children: ReactNode;
}

const ModalContext = createContext<ModalContextType | null>(null);

export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }: ModalProviderProps) => {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    defaultValue: '',
    onConfirm: null,
    onCancel: null,
  });

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const alert = useCallback((message: string, title: string = 'Notice'): Promise<void> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'alert',
        title,
        message,
        defaultValue: '',
        onConfirm: () => {
          closeModal();
          resolve();
        },
        onCancel: null,
      });
    });
  }, [closeModal]);

  const confirm = useCallback((message: string, title: string = 'Confirm'): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        defaultValue: '',
        onConfirm: () => {
          closeModal();
          resolve(true);
        },
        onCancel: () => {
          closeModal();
          resolve(false);
        },
      });
    });
  }, [closeModal]);

  const prompt = useCallback((message: string, defaultValue: string = '', title: string = 'Input Required'): Promise<string | null> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'prompt',
        title,
        message,
        defaultValue,
        onConfirm: (value?: string) => {
          closeModal();
          resolve(value ?? null);
        },
        onCancel: () => {
          closeModal();
          resolve(null);
        },
      });
    });
  }, [closeModal]);

  const value = {
    alert,
    confirm,
    prompt,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
      <Modal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        defaultValue={modalState.defaultValue}
        onConfirm={modalState.onConfirm ?? undefined}
        onCancel={modalState.onCancel ?? undefined}
      />
    </ModalContext.Provider>
  );
};
