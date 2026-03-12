import { useCallback, useEffect, useState } from "react";

/**
 * Reads and writes URL search params stored inside the hash fragment.
 * e.g. /#/?q=pasta&tags=Italian,Quick&sort=time-asc&tab=favorites
 *
 * The hash is split into a path part and a query part:
 *   window.location.hash = "#/path?key=value&key2=value2"
 *   path  = "/path"
 *   query = "key=value&key2=value2"
 */

function parseHashParams(): URLSearchParams {
  const hash = window.location.hash.slice(1); // remove leading #
  const qIdx = hash.indexOf("?");
  const search = qIdx >= 0 ? hash.slice(qIdx + 1) : "";
  return new URLSearchParams(search);
}

function getHashPath(): string {
  const hash = window.location.hash.slice(1);
  const qIdx = hash.indexOf("?");
  return qIdx >= 0 ? hash.slice(0, qIdx) : hash || "/";
}

function buildHash(path: string, params: URLSearchParams): string {
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function useHashParams(): [
  URLSearchParams,
  (updater: (prev: URLSearchParams) => URLSearchParams) => void
] {
  const [params, setParamsState] = useState<URLSearchParams>(parseHashParams);

  useEffect(() => {
    const handler = () => setParamsState(parseHashParams());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const setParams = useCallback(
    (updater: (prev: URLSearchParams) => URLSearchParams) => {
      const next = updater(parseHashParams());
      const path = getHashPath();
      // Only update hash if something actually changed
      const newHash = buildHash(path, next);
      if (window.location.hash.slice(1) !== newHash) {
        window.location.hash = newHash;
      }
    },
    []
  );

  return [params, setParams];
}
