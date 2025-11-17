import { useState, useEffect } from 'react';

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
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.warn(`Error saving localStorage key "${key}":`, error);
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
