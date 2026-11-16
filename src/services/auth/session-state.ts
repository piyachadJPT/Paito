import { isAuthApiError, isAuthError, isAuthRetryableFetchError } from "@supabase/supabase-js";

/**
 * Auth status as the UI sees it.
 * - signed_in:        usable session (or offline with a stored session we cannot refresh yet)
 * - session_expired:  we had a user, but the session is genuinely dead (not a network blip)
 * - signed_out:       no user on this device
 */
export type AuthStatus = "loading" | "signed_in" | "signed_out" | "session_expired";

export interface InitialSessionInput {
  hasSession: boolean;
  /** getSession() failed because of the network, not because the session is invalid */
  networkError: boolean;
  /** A user was signed in on this device before (and did not sign out) */
  knownUser: boolean;
}

export function statusFromInitialSession({ hasSession, networkError, knownUser }: InitialSessionInput): AuthStatus {
  if (hasSession) return "signed_in";
  // Offline with an expired access token: supabase-js keeps the stored session
  // and returns a retryable error. Never treat that as signed out (SPEC §8).
  if (networkError && knownUser) return "signed_in";
  return knownUser ? "session_expired" : "signed_out";
}

export interface AuthEventInput {
  event: string;
  hasSession: boolean;
  explicitSignOut: boolean;
  knownUser: boolean;
}

/** New status after an onAuthStateChange event, or null to keep the current one. */
export function statusFromAuthEvent({ event, hasSession, explicitSignOut, knownUser }: AuthEventInput): AuthStatus | null {
  // INITIAL_SESSION cannot tell a network failure from a dead session; the
  // provider resolves the initial state via getSession() instead.
  if (event === "INITIAL_SESSION") return null;
  if (event === "SIGNED_OUT") {
    return explicitSignOut || !knownUser ? "signed_out" : "session_expired";
  }
  return hasSession ? "signed_in" : null;
}

export type AuthErrorKind =
  | "network"
  | "not_allowed"
  | "rate_limited"
  | "invalid_email"
  | "invalid_code"
  | "unknown";

export const AUTH_ERROR_MESSAGES: Record<AuthErrorKind, string> = {
  network: "ไม่มีสัญญาณ ลองอีกครั้งเมื่อออนไลน์",
  not_allowed: "อีเมลนี้ไม่มีสิทธิ์เข้าใช้แอป",
  rate_limited: "ขอรหัสถี่เกินไป รอสักครู่แล้วลองใหม่",
  invalid_email: "รูปแบบอีเมลไม่ถูกต้อง",
  invalid_code: "รหัสไม่ถูกต้องหรือหมดอายุแล้ว",
  unknown: "มีบางอย่างผิดพลาด ลองใหม่อีกครั้ง",
};

const NOT_ALLOWED = new Set(["otp_disabled", "signup_disabled", "user_not_found"]);
const RATE_LIMITED = new Set(["over_email_send_rate_limit", "over_request_rate_limit", "over_sms_send_rate_limit"]);
const INVALID_CODE = new Set(["otp_expired", "invalid_credentials"]);

/** Classify an error from signInWithOtp ("email" step) or verifyOtp ("code" step). */
export function classifyAuthError(error: unknown, step: "email" | "code"): AuthErrorKind {
  if (isAuthRetryableFetchError(error)) return "network";
  if (error instanceof TypeError) return "network"; // fetch() rejected
  if (!isAuthError(error)) return "unknown";

  const code = error.code ?? "";
  if (RATE_LIMITED.has(code) || error.status === 429) return "rate_limited";
  if (NOT_ALLOWED.has(code)) return "not_allowed";
  if (step === "code" && (INVALID_CODE.has(code) || (isAuthApiError(error) && error.status === 403))) {
    return "invalid_code";
  }
  if (step === "email" && (code === "email_address_invalid" || code === "validation_failed")) {
    return "invalid_email";
  }
  if (step === "code" && code === "validation_failed") return "invalid_code";
  return "unknown";
}

export function authErrorMessage(error: unknown, step: "email" | "code"): string {
  return AUTH_ERROR_MESSAGES[classifyAuthError(error, step)];
}
