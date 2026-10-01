"use client";

import Link from "next/link";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { useState } from "react";
import { normalizeEmail, normalizeUsername, validEmail, validUsername } from "@/lib/identity";
import { passwordPolicy, passwordRequirements, passwordStrength } from "@/lib/password-policy";
import { useI18n } from "@/lib/i18n";

type Field = "displayName" | "username" | "email" | "password" | "confirmPassword";
type Form = Record<Field, string>;
type ServerCode = "DISPLAY_NAME_INVALID" | "USERNAME_INVALID" | "EMAIL_INVALID" | "PASSWORD_MISMATCH" | "PASSWORD_INVALID" | "EMAIL_TAKEN" | "USERNAME_TAKEN" | "EMAIL_NOT_CONFIGURED" | "EMAIL_ORIGIN_INVALID" | "EMAIL_SENDER_REJECTED" | "EMAIL_RECIPIENT_NOT_ALLOWED" | "EMAIL_DELIVERY_UNAVAILABLE" | "REGISTRATION_STORAGE_UNAVAILABLE" | "RATE_LIMITED" | "VALIDATION_ERROR";

const serverMessages: Record<ServerCode, string> = {
  DISPLAY_NAME_INVALID: "auth.displayNameInvalid", USERNAME_INVALID: "auth.usernameInvalid", EMAIL_INVALID: "auth.emailInvalid", PASSWORD_MISMATCH: "auth.passwordMatch", PASSWORD_INVALID: "auth.passwordInvalid", EMAIL_TAKEN: "auth.emailTaken", USERNAME_TAKEN: "auth.usernameTaken", EMAIL_NOT_CONFIGURED: "auth.emailNotConfigured", EMAIL_ORIGIN_INVALID: "auth.emailOriginInvalid", EMAIL_SENDER_REJECTED: "auth.emailSenderRejected", EMAIL_RECIPIENT_NOT_ALLOWED: "auth.emailRecipientNotAllowed", EMAIL_DELIVERY_UNAVAILABLE: "auth.emailUnavailable", REGISTRATION_STORAGE_UNAVAILABLE: "auth.registrationStorageUnavailable", RATE_LIMITED: "auth.rateLimited", VALIDATION_ERROR: "auth.fixForm",
};
const strengthStyle = {
  weak: { label: "auth.weak", width: "25%", color: "#dc2626" },
  medium: { label: "auth.medium", width: "50%", color: "#ea580c" },
  strong: { label: "auth.strong", width: "75%", color: "#16a34a" },
  veryStrong: { label: "auth.veryStrong", width: "100%", color: "#166534" },
} as const;

export function SignUpForm() {
  const { t, direction } = useI18n();
  const [form, setForm] = useState<Form>({ displayName: "", username: "", email: "", password: "", confirmPassword: "" });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const requirements = passwordRequirements(form.password);
  const currentStrength = passwordStrength(form.password);
  const passwordsMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const passwordError = form.password.length > 0 && !requirements.valid;
  const errors: Partial<Record<Field, string>> = {
    displayName: form.displayName.trim() && form.displayName.trim().length <= 120 ? undefined : t("auth.displayNameInvalid"),
    username: form.username && validUsername(normalizeUsername(form.username)) ? undefined : t("auth.usernameInvalid"),
    email: form.email && validEmail(normalizeEmail(form.email)) ? undefined : t("auth.emailInvalid"),
    password: passwordError ? t("auth.passwordInvalid") : undefined,
    confirmPassword: form.confirmPassword && !passwordsMatch ? t("auth.passwordMatch") : undefined,
  };
  const set = (key: Field) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((value) => ({ ...value, [key]: event.target.value }));
    setMessage(null);
  };
  const fieldClass = (field: Field) => `form-control ${touched[field] && errors[field] ? "auth-field-invalid" : touched[field] && !errors[field] ? "auth-field-valid" : ""}`;
  const markTouched = (field: Field) => () => setTouched((value) => ({ ...value, [field]: true }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setTouched({ displayName: true, username: true, email: true, password: true, confirmPassword: true });
    if (Object.values(errors).some(Boolean)) { setMessage({ text: t("auth.fixForm"), error: true }); return; }
    setBusy(true); setMessage(null);
    const payload = { ...form, displayName: form.displayName.trim(), username: normalizeUsername(form.username), email: normalizeEmail(form.email) };
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: { code?: ServerCode } } | null;
        const code = body?.error?.code;
        setMessage({ text: t(code && code in serverMessages ? serverMessages[code] : "auth.signupUnavailable"), error: true });
        return;
      }
      setMessage({ text: t("auth.accountCreated"), error: false });
    } catch { setMessage({ text: t("auth.signupUnavailable"), error: true }); }
    finally { setBusy(false); }
  };
  const requirementsList: Array<[keyof typeof requirements, string]> = [
    ["minLength", "auth.passwordMinLength"], ["lowercase", "auth.passwordLowercase"], ["uppercase", "auth.passwordUppercase"], ["digit", "auth.passwordDigit"], ["symbol", "auth.passwordSymbol"],
  ];
  return <main className="pwa-offline-page" dir={direction}><section><h1>{t("auth.createAccount")}</h1><form className="grid gap-4" onSubmit={submit} noValidate>
    <label className="grid gap-1 text-sm font-semibold">{t("auth.displayName")}<input className={fieldClass("displayName")} autoComplete="name" maxLength={120} value={form.displayName} onChange={set("displayName")} onBlur={markTouched("displayName")} aria-invalid={Boolean(touched.displayName && errors.displayName)} aria-describedby="signup-display-name-error" required /></label>
    {touched.displayName && errors.displayName ? <p id="signup-display-name-error" className="auth-field-error" role="alert">{errors.displayName}</p> : null}
    <label className="grid gap-1 text-sm font-semibold">{t("auth.username")}<input className={fieldClass("username")} dir="ltr" autoComplete="username" minLength={3} maxLength={30} pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,29}" value={form.username} onChange={set("username")} onBlur={markTouched("username")} aria-invalid={Boolean(touched.username && errors.username)} aria-describedby="signup-username-error" required /></label>
    {touched.username && errors.username ? <p id="signup-username-error" className="auth-field-error" role="alert">{errors.username}</p> : null}
    <label className="grid gap-1 text-sm font-semibold">{t("auth.email")}<input className={fieldClass("email")} type="email" dir="ltr" autoComplete="email" maxLength={254} value={form.email} onChange={set("email")} onBlur={markTouched("email")} aria-invalid={Boolean(touched.email && errors.email)} aria-describedby="signup-email-error" required /></label>
    {touched.email && errors.email ? <p id="signup-email-error" className="auth-field-error" role="alert">{errors.email}</p> : null}
    <label className="grid gap-1 text-sm font-semibold">{t("auth.password")}<span className="relative"><input className={`${fieldClass("password")} w-full pe-12`} type={show ? "text" : "password"} autoComplete="new-password" minLength={passwordPolicy.minLength} maxLength={passwordPolicy.maxLength} value={form.password} onChange={set("password")} onBlur={markTouched("password")} aria-invalid={Boolean(touched.password && errors.password)} aria-describedby="signup-password-requirements signup-password-error" required /><button type="button" className="absolute inset-y-0 end-0 grid min-w-11 place-items-center" aria-label={t(show ? "auth.hidePassword" : "auth.showPassword")} onClick={() => setShow((value) => !value)}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span></label>
    <div id="signup-password-requirements" className="text-sm" aria-live="polite"><strong>{t("auth.passwordRequirements")}</strong><ul className="mt-1 grid gap-1">{requirementsList.map(([key, label]) => <li key={key} className={requirements[key] ? "auth-requirement-met" : "auth-requirement"}>{requirements[key] ? <Check size={15} aria-hidden /> : <X size={15} aria-hidden />}{t(label)}</li>)}</ul><p className="mt-1 text-xs text-slate-600">{t("auth.passwordClasses")}</p>{!requirements.maxLength ? <p className="auth-field-error">{t("auth.passwordTooLong")}</p> : null}</div>
    <div aria-live="polite" className="text-sm"><strong style={{ color: strengthStyle[currentStrength].color }}>{t("auth.passwordStrength")}: {t(strengthStyle[currentStrength].label)}</strong><div className="mt-1 h-2 overflow-hidden rounded bg-slate-200"><div className="h-full rounded transition-all duration-200" style={{ width: strengthStyle[currentStrength].width, backgroundColor: strengthStyle[currentStrength].color }} /></div></div>
    {touched.password && errors.password ? <p id="signup-password-error" className="auth-field-error" role="alert">{errors.password}</p> : null}
    <label className="grid gap-1 text-sm font-semibold">{t("auth.confirmPassword")}<input className={fieldClass("confirmPassword")} type={show ? "text" : "password"} autoComplete="new-password" minLength={passwordPolicy.minLength} maxLength={passwordPolicy.maxLength} value={form.confirmPassword} onChange={set("confirmPassword")} onBlur={markTouched("confirmPassword")} aria-invalid={Boolean(touched.confirmPassword && errors.confirmPassword)} aria-describedby="signup-confirm-password-status" required /></label>
    {form.confirmPassword ? <p id="signup-confirm-password-status" className={passwordsMatch ? "auth-field-success" : "auth-field-error"} role="status">{passwordsMatch ? <><Check size={15} aria-hidden />{t("auth.passwordsMatch")}</> : <><X size={15} aria-hidden />{t("auth.passwordMatch")}</>}</p> : null}
    {message ? <p role={message.error ? "alert" : "status"} className={message.error ? "auth-field-error" : "auth-field-success"}>{message.text}</p> : null}
    <button className="min-h-11 rounded-lg bg-[var(--brand-navy)] px-4 font-bold text-[var(--brand-cream)] disabled:cursor-not-allowed disabled:opacity-60" disabled={busy || Boolean(errors.confirmPassword)} aria-busy={busy}>{t("auth.createAccount")}</button>
  </form><Link className="mt-5 inline-block text-sm underline" href="/login">{t("auth.signIn")}</Link></section></main>;
}
