import { useEffect, useState, useCallback } from "react";

export function useHashLocation(): [string, (path: string) => void] {
  const [location, setLocationState] = useState(() => {
    // Get the current hash and remove the leading #
    return window.location.hash.slice(1) || "/";
  });

  const handleHashChange = useCallback(() => {
    const newLocation = window.location.hash.slice(1) || "/";
    setLocationState(newLocation);
  }, []);

  useEffect(() => {
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [handleHashChange]);

  const setLocation = useCallback((path: string) => {
    window.location.hash = path;
  }, []);

  return [location, setLocation];
}
