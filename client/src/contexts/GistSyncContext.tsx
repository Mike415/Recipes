import { createContext, useContext, type ReactNode } from "react";
import { useGistSync, type SyncStatus } from "@/hooks/useGistSync";

interface GistSyncContextValue {
  syncStatus: SyncStatus;
  scheduleSave: () => void;
}

const GistSyncContext = createContext<GistSyncContextValue>({
  syncStatus: "disabled",
  scheduleSave: () => {},
});

export function GistSyncProvider({ children }: { children: ReactNode }) {
  const { syncStatus, scheduleSave } = useGistSync();
  return (
    <GistSyncContext.Provider value={{ syncStatus, scheduleSave }}>
      {children}
    </GistSyncContext.Provider>
  );
}

export function useGistSyncContext() {
  return useContext(GistSyncContext);
}
