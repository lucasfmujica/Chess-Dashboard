import { useState, useEffect } from 'react';

/** Event dispatched when a localStorage write fails (e.g. quota exceeded). */
export const STORAGE_ERROR_EVENT = 'chess-dashboard:storage-error';

/**
 * Detect a quota-exceeded error across browsers (name varies by engine).
 * @param {unknown} error
 * @returns {boolean}
 */
const isQuotaExceededError = (error) =>
  error instanceof DOMException &&
  (error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || // Firefox
    error.code === 22 ||
    error.code === 1014);

/**
 * Custom hook for persisting state to localStorage
 * @param {string} key - The localStorage key
 * @param {any} initialValue - The initial value if nothing is in localStorage
 * @returns {[any, Function]} - [state, setState]
 */
export const useLocalStorage = (key, initialValue) => {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.warn(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value) => {
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
      const message = isQuotaExceededError(error)
        ? 'Your browser storage is full, so this change could not be saved permanently. Free up space (e.g. remove old imported games) to keep your data.'
        : 'This change could not be saved to local storage and may be lost when you reload.';
      window.dispatchEvent(
        new CustomEvent(STORAGE_ERROR_EVENT, {
          detail: { key, message, quotaExceeded: isQuotaExceededError(error) },
        })
      );
    }
  };

  return [storedValue, setValue];
};

/**
 * Hook for batch loading multiple localStorage values
 * Useful for loading all persisted data at once
 */
export const useMultipleLocalStorage = (keys) => {
  const [values, setValues] = useState({});

  useEffect(() => {
    const loadedValues = {};
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
