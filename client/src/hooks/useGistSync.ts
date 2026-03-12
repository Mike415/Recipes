/**
 * useGistSync — client-side GitHub Gist sync for cross-device persistence.
 *
 * Syncs the following localStorage keys to a private GitHub Gist:
 *   recipes_favorites    → string[]
 *   recipes_ratings      → Record<string, number>
 *   recipes_notes        → Record<string, string>
 *   recipes_made_count   → Record<string, number>
 *   recipes_cart_ids     → string[]
 *   recipes_cart_checked → Record<string, boolean>
 *
 * Strategy:
 *   1. On mount: fetch Gist → merge with localStorage (union/max wins)
 *   2. On any watched-key change: debounce 2s → write to Gist
 *   3. Every 60s: pull from Gist and apply any remote changes
 *   4. Expose syncStatus so the UI can show a sync indicator
 */

import { useEffect, useRef, useCallback, useState } from "react";

const GIST_FILENAME = "morelli-family-recipes-data.json";
const DEBOUNCE_MS = 2000;
const POLL_INTERVAL_MS = 60_000;

// Keys we watch and sync
const WATCHED_KEYS = new Set([
  "recipes_favorites",
  "recipes_ratings",
  "recipes_notes",
  "recipes_made_count",
  "recipes_made_counts",
  "recipes_cart_ids",
  "recipes_cart_checked",
]);

// Token is embedded via Vite env var at build time
const GITHUB_TOKEN = import.meta.env.VITE_GIST_TOKEN as string | undefined;

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "disabled";

interface GistData {
  favorites: string[];
  ratings: Record<string, number>;
  notes: Record<string, string>;
  madeCounts: Record<string, number>;
  cartRecipeIds: string[];
  cartChecked: Record<string, boolean>;
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

// ─── Merge strategy ──────────────────────────────────────────────────────────

function mergeData(local: GistData, remote: GistData): GistData {
  // Favorites: union
  const favorites = Array.from(new Set([...local.favorites, ...remote.favorites]));

  // Ratings: take the higher value (user may have rated on either device)
  const ratings: Record<string, number> = { ...remote.ratings };
  for (const [id, r] of Object.entries(local.ratings)) {
    ratings[id] = Math.max(r, remote.ratings[id] ?? 0);
  }

  // Notes: non-empty local note wins (user just typed it); otherwise keep remote
  const notes: Record<string, string> = { ...remote.notes };
  for (const [id, n] of Object.entries(local.notes)) {
    if (n) notes[id] = n;
  }

  // Made counts: take the higher value
  const madeCounts: Record<string, number> = { ...remote.madeCounts };
  for (const [id, c] of Object.entries(local.madeCounts)) {
    madeCounts[id] = Math.max(c, remote.madeCounts[id] ?? 0);
  }

  // Cart IDs: use whichever was updated more recently
  const cartRecipeIds =
    local.lastUpdated >= remote.lastUpdated ? local.cartRecipeIds : remote.cartRecipeIds;

  // Checked items: merge — a checked item on either device stays checked
  const cartChecked: Record<string, boolean> = { ...remote.cartChecked };
  for (const [k, v] of Object.entries(local.cartChecked)) {
    cartChecked[k] = v || (remote.cartChecked[k] ?? false);
  }

  return {
    favorites,
    ratings,
    notes,
    madeCounts,
    cartRecipeIds,
    cartChecked,
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
    cartChecked: lsGet<Record<string, boolean>>("recipes_cart_checked", {}),
    lastUpdated: Date.now(),
  }), []);

  // ── Apply remote data to localStorage (without triggering another save) ───
  const applyToLocal = useCallback((data: GistData) => {
    lsSet("recipes_favorites", data.favorites);
    lsSet("recipes_ratings", data.ratings);
    lsSet("recipes_notes", data.notes);
    lsSet("recipes_made_count", data.madeCounts);
    lsSet("recipes_made_counts", data.madeCounts);
    lsSet("recipes_cart_ids", data.cartRecipeIds);
    lsSet("recipes_cart_checked", data.cartChecked);
    // Dispatch a generic storage event so React state re-reads from localStorage
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
        setTimeout(() => {
          if (isMountedRef.current) setSyncStatus("idle");
        }, 3000);
      } catch (err) {
        console.error("[GistSync] Save failed:", err);
        if (isMountedRef.current) setSyncStatus("error");
      }
    }, DEBOUNCE_MS);
  }, [getLocalData]);

  // ── Pull from Gist and apply remote changes ───────────────────────────────
  const pullAndApply = useCallback(async () => {
    if (!GITHUB_TOKEN || !gistIdRef.current) return;
    try {
      const remote = await readGist(GITHUB_TOKEN, gistIdRef.current);
      if (!remote || !isMountedRef.current) return;
      const local = getLocalData();
      const merged = mergeData(local, remote);
      applyToLocal(merged);
    } catch (err) {
      console.error("[GistSync] Pull failed:", err);
    }
  }, [getLocalData, applyToLocal]);

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

  // ── Listen for localStorage changes on watched keys → schedule save ───────
  useEffect(() => {
    if (!GITHUB_TOKEN) return;

    const handleStorage = (e: Event) => {
      // StorageEvent has a .key property; plain Event (from applyToLocal) does not
      if (e instanceof StorageEvent && e.key && !WATCHED_KEYS.has(e.key)) return;
      // Don't save when we're the ones applying remote data (plain Event)
      if (!(e instanceof StorageEvent)) return;
      scheduleSave();
    };

    window.addEventListener("storage", handleStorage);

    // Periodic pull every 60s to pick up changes from other devices
    const pollTimer = setInterval(pullAndApply, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(pollTimer);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [scheduleSave, pullAndApply]);

  return { syncStatus, scheduleSave };
}
