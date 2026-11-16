import { describe, expect, it, vi } from "vitest";
import { isAuthorized, runKeepalive } from "./keepalive";

const ok = () => Promise.resolve({ data: "2026-11-17T03:00:00+00:00", error: null });

describe("isAuthorized", () => {
  it.each([
    ["Bearer s3cret", "s3cret", true],
    ["Bearer wrong!", "s3cret", false],
    ["s3cret", "s3cret", false],
    [null, "s3cret", false],
    ["Bearer ", "", false],
    ["Bearer undefined", undefined, false],
  ])("%s / %s → %s", (header, secret, expected) => {
    expect(isAuthorized(header, secret)).toBe(expected);
  });
});

describe("runKeepalive", () => {
  it("401 without the secret and does not ping", async () => {
    const ping = vi.fn(ok);
    expect((await runKeepalive({ authorization: null, secret: "s", ping })).status).toBe(401);
    expect((await runKeepalive({ authorization: "Bearer x", secret: "s", ping })).status).toBe(401);
    expect(ping).not.toHaveBeenCalled();
  });

  it("200 with the secret", async () => {
    const r = await runKeepalive({ authorization: "Bearer s", secret: "s", ping: ok });
    expect(r).toEqual({ status: 200, body: { ok: true, at: "2026-11-17T03:00:00+00:00" } });
  });

  it("500 when CRON_SECRET is missing — never open", async () => {
    const ping = vi.fn(ok);
    expect((await runKeepalive({ authorization: "Bearer undefined", secret: undefined, ping })).status).toBe(500);
    expect(ping).not.toHaveBeenCalled();
  });

  it("502 when Supabase errors or throws", async () => {
    expect((await runKeepalive({ authorization: "Bearer s", secret: "s", ping: () => Promise.resolve({ data: null, error: { message: "down" } }) })).body.error).toBe("down");
    expect((await runKeepalive({ authorization: "Bearer s", secret: "s", ping: () => Promise.reject(new Error("net")) })).status).toBe(502);
  });
});
