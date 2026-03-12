/**
 * useGistSync — client-side GitHub Gist sync for cross-device persistence.
 *
 * Syncs the following localStorage keys to a private GitHub Gist:
 *   recipes_favorites   → string[]
 *   recipes_ratings     → Record<string, number>
 *   recipes_notes       → Record<string, string>
 *   recipes_made_count  → Record<string, number>
 *   recipes_cart        → string[]   (cart recipe IDs)
 *
 * Strategy:
 *   1. On mount: fetch Gist → merge with localStorage (Gist wins for newer data)
 *   2. On any change: debounce 2s → save to Gist
 *   3. Expose syncStatus so the UI can show a sync indicator
 */

import { useEffect, useRef, useCallback, useState } from "react";

const GIST_FILENAME = "morelli-family-recipes-data.json";
const DEBOUNCE_MS = 2000;

// Token is embedded via Vite env var at build time
const GITHUB_TOKEN = import.meta.env.VITE_GIST_TOKEN as string | undefined;

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "disabled";

interface GistData {
  favorites: string[];
  ratings: Record<string, number>;
  notes: Record<string, string>;
  madeCounts: Record<string, number>;
  cartRecipeIds: string[];
  lastUpdated: number;
}

// ─── localStorage helpers ────────────────────────────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — ignore */
  }
}

// ─── Gist API helpers ────────────────────────────────────────────────────────

async function findGistId(token: string): Promise<string | null> {
  const res = await fetch("https://api.github.com/gists?per_page=100", {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const gists: any[] = await res.json();
  const found = gists.find((g) => g.files[GIST_FILENAME]);
  return found?.id ?? null;
}

async function readGist(token: string, gistId: string): Promise<GistData | null> {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const content = data.files[GIST_FILENAME]?.content;
  if (!content) return null;
  return JSON.parse(content) as GistData;
}

async function writeGist(
  token: string,
  gistId: string | null,
  payload: GistData
): Promise<string> {
  const body = gistId
    ? { files: { [GIST_FILENAME]: { content: JSON.stringify(payload, null, 2) } } }
    : {
        description: "Morelli Family Recipes — User Data",
        public: false,
        files: { [GIST_FILENAME]: { content: JSON.stringify(payload, null, 2) } },
      };
  const res = await fetch(
    gistId ? `https://api.github.com/gists/${gistId}` : "https://api.github.com/gists",
    {
      method: gistId ? "PATCH" : "POST",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const result = await res.json();
  return result.id as string;
}

// ─── Merge strategy: take union of favorites, max rating, latest note, max made count ──

function mergeData(local: GistData, remote: GistData): GistData {
  const favorites = Array.from(new Set([...local.favorites, ...remote.favorites]));

  const ratings: Record<string, number> = { ...remote.ratings };
  for (const [id, r] of Object.entries(local.ratings)) {
    ratings[id] = Math.max(r, remote.ratings[id] ?? 0);
  }

  const notes: Record<string, string> = { ...remote.notes };
  for (const [id, n] of Object.entries(local.notes)) {
    if (n) notes[id] = n; // local note wins if non-empty (user just typed it)
  }

  const madeCounts: Record<string, number> = { ...remote.madeCounts };
  for (const [id, c] of Object.entries(local.madeCounts)) {
    madeCounts[id] = Math.max(c, remote.madeCounts[id] ?? 0);
  }

  // Cart: use whichever was updated more recently
  const cartRecipeIds =
    local.lastUpdated >= remote.lastUpdated ? local.cartRecipeIds : remote.cartRecipeIds;

  return {
    favorites,
    ratings,
    notes,
    madeCounts,
    cartRecipeIds,
    lastUpdated: Math.max(local.lastUpdated, remote.lastUpdated),
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useGistSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    GITHUB_TOKEN ? "idle" : "disabled"
  );
  const gistIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ── Read current local state ──────────────────────────────────────────────
  const getLocalData = useCallback((): GistData => ({
    favorites: lsGet<string[]>("recipes_favorites", []),
    ratings: lsGet<Record<string, number>>("recipes_ratings", {}),
    notes: lsGet<Record<string, string>>("recipes_notes", {}),
    madeCounts: {
      ...lsGet<Record<string, number>>("recipes_made_count", {}),
      ...lsGet<Record<string, number>>("recipes_made_counts", {}),
    },
    cartRecipeIds: lsGet<string[]>("recipes_cart_ids", []),
    lastUpdated: Date.now(),
  }), []);

  // ── Apply remote data to localStorage ────────────────────────────────────
  const applyToLocal = useCallback((data: GistData) => {
    lsSet("recipes_favorites", data.favorites);
    lsSet("recipes_ratings", data.ratings);
    lsSet("recipes_notes", data.notes);
    lsSet("recipes_made_count", data.madeCounts);
    lsSet("recipes_made_counts", data.madeCounts);
    lsSet("recipes_cart_ids", data.cartRecipeIds);
    // Dispatch storage events so React state updates across hooks
    window.dispatchEvent(new Event("storage"));
  }, []);

  // ── Save to Gist (debounced) ──────────────────────────────────────────────
  const scheduleSave = useCallback(() => {
    if (!GITHUB_TOKEN) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      setSyncStatus("syncing");
      try {
        const local = getLocalData();
        local.lastUpdated = Date.now();
        gistIdRef.current = await writeGist(GITHUB_TOKEN, gistIdRef.current, local);
        if (isMountedRef.current) setSyncStatus("synced");
        // Reset to idle after 3s
        setTimeout(() => {
          if (isMountedRef.current) setSyncStatus("idle");
        }, 3000);
      } catch (err) {
        console.error("[GistSync] Save failed:", err);
        if (isMountedRef.current) setSyncStatus("error");
      }
    }, DEBOUNCE_MS);
  }, [getLocalData]);

  // ── Initial load: fetch Gist and merge ───────────────────────────────────
  useEffect(() => {
    if (!GITHUB_TOKEN) return;

    (async () => {
      setSyncStatus("syncing");
      try {
        const gistId = await findGistId(GITHUB_TOKEN);
        gistIdRef.current = gistId;

        if (gistId) {
          const remote = await readGist(GITHUB_TOKEN, gistId);
          if (remote) {
            const local = getLocalData();
            const merged = mergeData(local, remote);
            applyToLocal(merged);
          }
        }

        if (isMountedRef.current) setSyncStatus("synced");
        setTimeout(() => {
          if (isMountedRef.current) setSyncStatus("idle");
        }, 3000);
      } catch (err) {
        console.error("[GistSync] Initial load failed:", err);
        if (isMountedRef.current) setSyncStatus("error");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Listen for localStorage changes and schedule save ────────────────────
  useEffect(() => {
    if (!GITHUB_TOKEN) return;

    const handleStorage = () => scheduleSave();
    window.addEventListener("storage", handleStorage);

    // Also poll for changes made in the same tab (storage event doesn't fire for same-tab writes)
    const interval = setInterval(() => scheduleSave(), 30_000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [scheduleSave]);

  return { syncStatus, scheduleSave };
}
