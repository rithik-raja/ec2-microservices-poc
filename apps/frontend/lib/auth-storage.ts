import type { LoginResponse } from "@/types/api";

const STORAGE_KEY = "simple-threads-session";
const SESSION_EVENT = "simple-threads-session-updated";
let cachedRawSession: string | null = null;
let cachedSession: Session | null = null;

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
    cachedRawSession = null;
    cachedSession = null;
    return null;
  }

  if (raw === cachedRawSession) {
    return cachedSession;
  }

  try {
    const parsed = JSON.parse(raw) as Session;
    if (!parsed.accessToken || !parsed.user?.id) {
      cachedRawSession = null;
      cachedSession = null;
      return null;
    }
    cachedRawSession = raw;
    cachedSession = parsed;
    return parsed;
  } catch {
    cachedRawSession = null;
    cachedSession = null;
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

  const raw = JSON.stringify(session);
  cachedRawSession = raw;
  cachedSession = session;
  window.localStorage.setItem(STORAGE_KEY, raw);
  notifySessionUpdated();
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  cachedRawSession = null;
  cachedSession = null;
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
