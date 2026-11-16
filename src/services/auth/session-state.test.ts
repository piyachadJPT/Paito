import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  AUTH_ERROR_MESSAGES,
  authErrorMessage,
  classifyAuthError,
  statusFromAuthEvent,
  statusFromInitialSession,
} from "./session-state";

describe("statusFromInitialSession", () => {
  it("signed in when a session loads", () => {
    expect(statusFromInitialSession({ hasSession: true, networkError: false, knownUser: true })).toBe("signed_in");
  });

  it("stays signed in when offline and the refresh fails on the network", () => {
    expect(statusFromInitialSession({ hasSession: false, networkError: true, knownUser: true })).toBe("signed_in");
  });

  it("session expired when a known user's session is gone for real", () => {
    expect(statusFromInitialSession({ hasSession: false, networkError: false, knownUser: true })).toBe("session_expired");
  });

  it("signed out on a fresh device, even with a network error", () => {
    expect(statusFromInitialSession({ hasSession: false, networkError: false, knownUser: false })).toBe("signed_out");
    expect(statusFromInitialSession({ hasSession: false, networkError: true, knownUser: false })).toBe("signed_out");
  });
});

describe("statusFromAuthEvent", () => {
  const base = { hasSession: false, explicitSignOut: false, knownUser: true };

  it("ignores INITIAL_SESSION", () => {
    expect(statusFromAuthEvent({ ...base, event: "INITIAL_SESSION", hasSession: true })).toBeNull();
  });

  it.each(["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"])("%s with a session → signed_in", (event) => {
    expect(statusFromAuthEvent({ ...base, event, hasSession: true })).toBe("signed_in");
  });

  it("an unrequested SIGNED_OUT means the session died → session_expired", () => {
    expect(statusFromAuthEvent({ ...base, event: "SIGNED_OUT" })).toBe("session_expired");
  });

  it("SIGNED_OUT after the user pressed sign out → signed_out", () => {
    expect(statusFromAuthEvent({ ...base, event: "SIGNED_OUT", explicitSignOut: true })).toBe("signed_out");
  });

  it("SIGNED_OUT with no known user → signed_out", () => {
    expect(statusFromAuthEvent({ ...base, event: "SIGNED_OUT", knownUser: false })).toBe("signed_out");
  });

  it("keeps the current status for events without a session", () => {
    expect(statusFromAuthEvent({ ...base, event: "TOKEN_REFRESHED" })).toBeNull();
  });
});

describe("classifyAuthError", () => {
  const api = (code: string, status = 400) => new AuthApiError("x", status, code);

  it("network failures", () => {
    expect(classifyAuthError(new AuthRetryableFetchError("Failed to fetch", 0), "email")).toBe("network");
    expect(classifyAuthError(new TypeError("Failed to fetch"), "code")).toBe("network");
  });

  it("email not allowed to sign in (sign-ups disabled)", () => {
    expect(classifyAuthError(api("otp_disabled", 422), "email")).toBe("not_allowed");
    expect(classifyAuthError(api("signup_disabled", 422), "email")).toBe("not_allowed");
    expect(classifyAuthError(api("user_not_found", 404), "email")).toBe("not_allowed");
  });

  it("rate limits by code or status", () => {
    expect(classifyAuthError(api("over_email_send_rate_limit", 429), "email")).toBe("rate_limited");
    expect(classifyAuthError(api("over_request_rate_limit", 429), "code")).toBe("rate_limited");
    expect(classifyAuthError(api("", 429), "email")).toBe("rate_limited");
  });

  it("invalid email", () => {
    expect(classifyAuthError(api("email_address_invalid"), "email")).toBe("invalid_email");
    expect(classifyAuthError(api("validation_failed"), "email")).toBe("invalid_email");
  });

  it("wrong or expired code", () => {
    expect(classifyAuthError(api("otp_expired", 403), "code")).toBe("invalid_code");
    expect(classifyAuthError(api("", 403), "code")).toBe("invalid_code");
    expect(classifyAuthError(api("validation_failed"), "code")).toBe("invalid_code");
  });

  it("anything else is unknown", () => {
    expect(classifyAuthError(new Error("boom"), "email")).toBe("unknown");
    expect(classifyAuthError(api("unexpected_failure", 500), "email")).toBe("unknown");
    expect(classifyAuthError(null, "code")).toBe("unknown");
  });

  it("maps to Thai messages", () => {
    expect(authErrorMessage(api("otp_expired", 403), "code")).toBe(AUTH_ERROR_MESSAGES.invalid_code);
    expect(authErrorMessage(api("otp_disabled", 422), "email")).toBe("อีเมลนี้ไม่มีสิทธิ์เข้าใช้แอป");
  });
});
