"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
type VerificationMessage = "auth.verifyEmailSuccess" | "auth.verifyEmailInvalid" | "auth.verifyEmailExpired" | "auth.verifyEmailUsed" | "auth.verifyEmailAlreadyVerified" | "auth.verifyEmailUnavailable";
const verificationMessages: Record<string, VerificationMessage> = {
  EMAIL_VERIFICATION_INVALID: "auth.verifyEmailInvalid",
  EMAIL_VERIFICATION_EXPIRED: "auth.verifyEmailExpired",
  EMAIL_VERIFICATION_ALREADY_USED: "auth.verifyEmailUsed",
  EMAIL_VERIFICATION_ALREADY_VERIFIED: "auth.verifyEmailAlreadyVerified",
  DEPENDENCY_UNAVAILABLE: "auth.verifyEmailUnavailable",
};

export function VerifyEmailPage() {
  const { t, direction } = useI18n();
  const search = useSearchParams();
  const token = search.get("token");
  const submittedToken = useRef<string | null>(null);
  const [message, setMessage] = useState<VerificationMessage | null>(null);
  const [busy, setBusy] = useState(Boolean(token));
  useEffect(() => {
    if (!token) return;
    if (submittedToken.current === token) return;
    submittedToken.current = token;
    let active = true;
    void fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (response) => {
        if (!active) return;
        if (response.ok) { setMessage("auth.verifyEmailSuccess"); return; }
        const body = await response.json().catch(() => null) as { error?: { code?: string } } | null;
        setMessage(verificationMessages[body?.error?.code ?? ""] ?? "auth.verifyEmailUnavailable");
      })
      .catch(() => { if (active) setMessage("auth.verifyEmailUnavailable"); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [token]);
  const displayedMessage = token ? message : "auth.verifyEmailInvalid" as const;
  const success = displayedMessage === "auth.verifyEmailSuccess";
  return <main className="pwa-offline-page" dir={direction}><section><h1>{t("auth.verifyEmailTitle")}</h1><p role={success ? "status" : displayedMessage ? "alert" : "status"} className={success ? "auth-field-success" : displayedMessage ? "auth-field-error" : "text-sm text-slate-600"} aria-busy={busy}>{displayedMessage ? t(displayedMessage) : busy ? "…" : ""}</p>{success ? <Link className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[var(--brand-navy)] px-4 font-bold text-[var(--brand-cream)]" href="/login">{t("auth.continueToLogin")}</Link> : null}</section></main>;
}
export function ResetPasswordPage() { const { t, direction } = useI18n(); const router = useRouter(); const search = useSearchParams(); const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState(""); const [message, setMessage] = useState(""); const submit = async (event: React.FormEvent) => { event.preventDefault(); if (password !== confirmPassword) { setMessage(t("auth.passwordMatch")); return; } const response = await fetch("/api/auth/reset-password", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ token: search.get("token"), password, confirmPassword }) }); if (!response.ok) { setMessage(t("auth.invalid")); return; } setMessage(t("auth.verifySuccess")); router.replace("/login"); }; return <main className="pwa-offline-page" dir={direction}><section><h1>{t("auth.forgotPassword")}</h1><form className="grid gap-4" onSubmit={submit}><label>{t("auth.password")}<input className="form-control" type="password" autoComplete="new-password" minLength={12} maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)} required /></label><label>{t("auth.confirmPassword")}<input className="form-control" type="password" autoComplete="new-password" minLength={12} maxLength={1024} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label><button className="min-h-11 rounded-lg bg-[var(--brand-navy)] px-4 font-bold text-[var(--brand-cream)]">{t("auth.forgotPassword")}</button></form>{message ? <p role="status">{message}</p> : null}</section></main>; }
