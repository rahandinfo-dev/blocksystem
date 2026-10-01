import { verificationEnvironment } from "./server-env.ts";

export type AuthEmailDelivery =
  | "sent"
  | "not_configured"
  | "origin_invalid"
  | "sender_rejected"
  | "recipient_not_allowed"
  | "unavailable";

function origin() { return verificationEnvironment().publicOrigin; }

function resendFailureCategory(status: number, body: unknown): AuthEmailDelivery {
  const detail = typeof body === "object" && body
    ? ["name", "message"].map((key) => (typeof (body as Record<string, unknown>)[key] === "string" ? (body as Record<string, unknown>)[key] : "")).join(" ").toLowerCase()
    : "";
  // Resend test-mode rejects recipients that the test sender is not permitted
  // to reach. Match the provider's restriction without returning its text.
  if (/(testing email|test mode|own email|only.*(?:send|recipient)|recipient.*(?:allow|permit))/.test(detail)) return "recipient_not_allowed";
  if (status === 400 || status === 403 || status === 422) {
    if (/(from|sender|domain)/.test(detail)) return "sender_rejected";
  }
  return "unavailable";
}

export async function sendAuthEmail(input: { to: string; subject: string; path: string; action: string; expires: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from) return "not_configured" as const;
  let base: string | undefined;
  try { base = origin(); } catch { return "origin_invalid" as const; }
  if (!base) return "not_configured" as const;
  const url = new URL(input.path, base).toString();
  try {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: input.to, subject: input.subject, html: `<main style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h1>BlockSystem</h1><p>Use the secure link below to ${input.action}.</p><p><a href="${url}">Continue securely</a></p><p>This link expires at ${new Date(input.expires).toUTCString()}. If you did not request this, you can ignore this email.</p></main>` }), cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (response.ok) return "sent" as const;
    return resendFailureCategory(response.status, await response.json().catch(() => null));
  } catch { return "unavailable" as const; }
}
