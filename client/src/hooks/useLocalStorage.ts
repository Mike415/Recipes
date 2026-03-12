import { useState, useCallback } from "react";

/**
 * useLocalStorage — persists state to localStorage and fires a synthetic
 * "storage" event on every write so that same-tab listeners (e.g. the Gist
 * sync hook) are notified immediately.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        // Notify same-tab listeners (the native "storage" event only fires for
        // cross-tab writes, so we dispatch a synthetic one here).
        window.dispatchEvent(
          new StorageEvent("storage", { key, newValue: JSON.stringify(valueToStore) })
        );
      } catch {
        // ignore
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue] as const;
}
