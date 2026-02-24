"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

import {
  clearStoredSession,
  getStoredSession,
  storeSession,
  subscribeToSession,
  type Session,
} from "@/lib/auth-storage";

type AuthContextValue = {
  isReady: boolean;
  session: Session | null;
  isAuthenticated: boolean;
  setSession: (session: Session) => void;
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribeToSession, getStoredSession, () => null);

  const setSession = useCallback((nextSession: Session) => {
    storeSession(nextSession);
  }, []);

  const clearSession = useCallback(() => {
    clearStoredSession();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady: true,
      session,
      isAuthenticated: Boolean(session?.accessToken),
      setSession,
      clearSession,
    }),
    [clearSession, session, setSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
