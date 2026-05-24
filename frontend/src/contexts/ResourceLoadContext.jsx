import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";

const ResourceLoadContext = createContext(null);

/**
 * Provider for resource load signaling (e.g. map ready).
 * Resets readyKeys when pathname changes so the new page's resources can signal again.
 */
export function ResourceLoadProvider({ children }) {
  const [readyKeys, setReadyKeys] = useState(new Set());
  const { pathname } = useLocation();

  useEffect(() => {
    setReadyKeys(new Set());
  }, [pathname]);

  const signalReady = useCallback((key) => {
    setReadyKeys((prev) => new Set(prev).add(key));
  }, []);

  const isReady = useCallback((key) => {
    return readyKeys.has(key);
  }, [readyKeys]);

  const value = { signalReady, isReady };

  return (
    <ResourceLoadContext.Provider value={value}>
      {children}
    </ResourceLoadContext.Provider>
  );
}

export function useResourceLoad() {
  const ctx = useContext(ResourceLoadContext);
  if (!ctx) {
    throw new Error("useResourceLoad must be used within ResourceLoadProvider");
  }
  return ctx;
}
