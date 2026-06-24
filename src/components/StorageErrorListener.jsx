import { useEffect, useRef } from 'react';
import { useModal } from './modals/ModalContext';
import { STORAGE_ERROR_EVENT } from '../hooks/useLocalStorage';

/**
 * Listens for localStorage write failures (dispatched by useLocalStorage) and
 * surfaces them to the user via the shared modal, so data loss is never silent.
 * Renders nothing.
 */
const StorageErrorListener = () => {
  const modal = useModal();
  // Guard so we don't stack multiple modals if several writes fail at once.
  const isShowingRef = useRef(false);

  useEffect(() => {
    const handleStorageError = async (event) => {
      if (isShowingRef.current) return;
      isShowingRef.current = true;
      const message =
        event.detail?.message ?? 'A change could not be saved to local storage.';
      try {
        await modal.alert(message, 'Could not save');
      } finally {
        isShowingRef.current = false;
      }
    };

    window.addEventListener(STORAGE_ERROR_EVENT, handleStorageError);
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, handleStorageError);
  }, [modal]);

  return null;
};

export default StorageErrorListener;
