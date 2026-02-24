import type { LoginResponse } from "@/types/api";

const STORAGE_KEY = "simple-threads-session";
const SESSION_EVENT = "simple-threads-session-updated";

export type Session = Pick<
  LoginResponse,
  "accessToken" | "refreshToken" | "idToken" | "expiresIn" | "tokenType" | "user"
>;

export function getStoredSession(): Session | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Session;
    if (!parsed.accessToken || !parsed.user?.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function notifySessionUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function storeSession(session: Session) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  notifySessionUpdated();
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  notifySessionUpdated();
}

export function subscribeToSession(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(SESSION_EVENT, handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(SESSION_EVENT, handler);
  };
}
