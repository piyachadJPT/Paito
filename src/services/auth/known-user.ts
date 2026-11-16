/**
 * Remembers who was signed in on this device, so we can tell "session died"
 * (show read-only + re-login banner) from "never signed in" (go to /login),
 * and still show the email while offline.
 */
export interface KnownUser {
  id: string;
  email: string | null;
}

const KEY = "paito.user";

export function readKnownUser(): KnownUser | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<KnownUser>;
    return typeof v.id === "string" ? { id: v.id, email: typeof v.email === "string" ? v.email : null } : null;
  } catch {
    return null;
  }
}

export function writeKnownUser(user: KnownUser): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    // storage blocked: the session itself still works
  }
}

export function clearKnownUser(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
