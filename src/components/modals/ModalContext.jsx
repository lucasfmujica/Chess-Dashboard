import React, { createContext, useContext, useState, useCallback } from 'react';
import Modal from './Modal';

const ModalContext = createContext(null);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'alert', // 'alert', 'confirm', 'prompt'
    title: '',
    message: '',
    defaultValue: '',
    onConfirm: null,
    onCancel: null,
  });

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const alert = useCallback((message, title = 'Notice') => {
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

  const confirm = useCallback((message, title = 'Confirm') => {
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

  const prompt = useCallback((message, defaultValue = '', title = 'Input Required') => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'prompt',
        title,
        message,
        defaultValue,
        onConfirm: (value) => {
          closeModal();
          resolve(value);
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
        onConfirm={modalState.onConfirm}
        onCancel={modalState.onCancel}
      />
    </ModalContext.Provider>
  );
};
