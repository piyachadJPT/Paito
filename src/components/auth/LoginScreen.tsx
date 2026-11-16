"use client";

import { ArrowLeft, MapPin, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { OTP_LENGTH, OtpInput } from "@/components/ui/OtpInput";
import { Splash } from "@/components/ui/Splash";
import { TextField } from "@/components/ui/TextField";
import { useNow } from "@/hooks/useNow";
import { clock } from "@/lib/clock";
import { useAuth } from "@/services/auth/AuthProvider";
import { AUTH_ERROR_MESSAGES, authErrorMessage } from "@/services/auth/session-state";
import { getSupabase } from "@/services/supabase/client";

export const RESEND_AFTER_MS = 60_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Seconds left before "ส่งรหัสใหม่" is allowed, or 0. */
export function resendSecondsLeft(sentAt: number | null, nowMs: number | null): number {
  if (sentAt === null || nowMs === null) return 0;
  return Math.max(0, Math.ceil((sentAt + RESEND_AFTER_MS - nowMs) / 1000));
}

function formatSeconds(total: number): string {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

type Step = "email" | "code";

/** Two-step email OTP login (SPEC §8, §10.6). */
export function LoginScreen() {
  const { status, readOnly } = useAuth();
  const router = useRouter();
  const now = useNow();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "signed_in") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (step === "code") otpRef.current?.focus();
  }, [step]);

  async function sendCode() {
    const address = email.trim().toLowerCase();
    if (!EMAIL_RE.test(address)) {
      setError(AUTH_ERROR_MESSAGES.invalid_email);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await getSupabase().auth.signInWithOtp({
        email: address,
        options: { shouldCreateUser: false },
      });
      if (err) {
        setError(authErrorMessage(err, "email"));
        return;
      }
      setEmail(address);
      setCode("");
      setSentAt(clock.nowMs());
      setStep("code");
    } catch (err) {
      setError(authErrorMessage(err, "email"));
    } finally {
      setBusy(false);
    }
  }

  async function verify(token: string) {
    if (token.length !== OTP_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await getSupabase().auth.verifyOtp({ email, token, type: "email" });
      if (err) {
        setError(authErrorMessage(err, "code"));
        setCode("");
        otpRef.current?.focus();
      }
      // Success: AuthProvider receives SIGNED_IN and the effect above redirects.
    } catch (err) {
      setError(authErrorMessage(err, "code"));
    } finally {
      setBusy(false);
    }
  }

  function onSubmitEmail(e: FormEvent) {
    e.preventDefault();
    void sendCode();
  }

  function onSubmitCode(e: FormEvent) {
    e.preventDefault();
    void verify(code);
  }

  if (status === "loading" || status === "signed_in") return <Splash />;

  const secondsLeft = resendSecondsLeft(sentAt, now?.getTime() ?? null);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-[calc(env(safe-area-inset-top)+56px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <header className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary text-on-primary">
          <MapPin aria-hidden size={26} strokeWidth={2.4} />
        </span>
        <div>
          <h1 className="text-[34px] leading-none font-bold tracking-tight">ไปต่อ</h1>
          <p className="mt-1 text-[15px] text-ink-2">อยู่ไหน · ไปไหนต่อ · ต้องออกกี่โมง</p>
        </div>
      </header>

      {readOnly && (
        <p className="mt-8 rounded-2xl bg-primary-soft px-4 py-3 text-[15px] text-ink">
          เซสชันหมดอายุ เข้าสู่ระบบอีกครั้งเพื่อแก้ไขและ sync ข้อมูลในเครื่องยังอยู่ครบ
        </p>
      )}

      {step === "email" ? (
        <form onSubmit={onSubmitEmail} noValidate className="mt-10 flex flex-col gap-6">
          <TextField
            label="อีเมล"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            error={error}
            hint={`เราจะส่งรหัส ${OTP_LENGTH} หลักไปที่อีเมลนี้`}
            disabled={busy}
          />
          <Button type="submit" loading={busy} icon={<Send aria-hidden size={18} />}>
            ส่งรหัส
          </Button>
        </form>
      ) : (
        <form onSubmit={onSubmitCode} noValidate className="mt-10 flex flex-col gap-6">
          <p className="text-[15px] text-ink-2">
            ส่งรหัสไปที่ <span className="font-semibold break-all text-ink">{email}</span> แล้ว
          </p>
          <OtpInput
            ref={otpRef}
            label={`รหัส ${OTP_LENGTH} หลัก`}
            value={code}
            onChange={(v) => {
              setCode(v);
              setError(null);
            }}
            onComplete={(v) => void verify(v)}
            error={error}
            disabled={busy}
          />
          <Button type="submit" loading={busy} disabled={code.length !== OTP_LENGTH}>
            เข้าสู่ระบบ
          </Button>
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="md"
              icon={<ArrowLeft aria-hidden size={18} />}
              onClick={() => {
                setStep("email");
                setError(null);
              }}
              disabled={busy}
            >
              เปลี่ยนอีเมล
            </Button>
            <Button variant="ghost" size="md" onClick={() => void sendCode()} disabled={busy || secondsLeft > 0}>
              {secondsLeft > 0 ? (
                <>
                  ส่งรหัสใหม่ใน <span className="tabular-nums">{formatSeconds(secondsLeft)}</span>
                </>
              ) : (
                "ส่งรหัสใหม่"
              )}
            </Button>
          </div>
        </form>
      )}
    </main>
  );
}
