import { useState, useEffect } from 'react';

/** Event dispatched when a localStorage write fails (e.g. quota exceeded). */
export const STORAGE_ERROR_EVENT = 'chess-dashboard:storage-error';

export interface StorageErrorDetail {
  key: string;
  message: string;
  quotaExceeded: boolean;
}

/**
 * Detect a quota-exceeded error across browsers (name varies by engine).
 */
const isQuotaExceededError = (error: unknown): boolean =>
  error instanceof DOMException &&
  (error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || // Firefox
    error.code === 22 ||
    error.code === 1014);

type SetValue<T> = (value: T | ((prev: T) => T)) => void;

/**
 * Custom hook for persisting state to localStorage.
 */
export const useLocalStorage = <T,>(key: string, initialValue: T): [T, SetValue<T>] => {
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue: SetValue<T> = (value) => {
    // Allow value to be a function so we have same API as useState
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    // Update React state first so the UI stays responsive even if persistence fails.
    setStoredValue(valueToStore);
    // Persist to localStorage (this is the part that can throw on quota limits).
    try {
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error saving localStorage key "${key}":`, error);
      // Surface quota errors so the user knows their data was not persisted,
      // instead of losing it silently. A top-level listener shows a modal.
      const quotaExceeded = isQuotaExceededError(error);
      const message = quotaExceeded
        ? 'Your browser storage is full, so this change could not be saved permanently. Free up space (e.g. remove old imported games) to keep your data.'
        : 'This change could not be saved to local storage and may be lost when you reload.';
      const detail: StorageErrorDetail = { key, message, quotaExceeded };
      window.dispatchEvent(new CustomEvent(STORAGE_ERROR_EVENT, { detail }));
    }
  };

  return [storedValue, setValue];
};

interface MultiKey {
  key: string;
  defaultValue: unknown;
}

/**
 * Hook for batch loading multiple localStorage values.
 */
export const useMultipleLocalStorage = (keys: MultiKey[]): Record<string, unknown> => {
  const [values, setValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const loadedValues: Record<string, unknown> = {};
    keys.forEach(({ key, defaultValue }) => {
      try {
        const item = window.localStorage.getItem(key);
        loadedValues[key] = item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.warn(`Error loading localStorage key "${key}":`, error);
        loadedValues[key] = defaultValue;
      }
    });
    setValues(loadedValues);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return values;
};

export default useLocalStorage;
