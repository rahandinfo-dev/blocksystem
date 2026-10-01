import { verificationEnvironment } from "./server-env.ts";

function origin() {
  return verificationEnvironment().publicOrigin ?? (process.env.NODE_ENV === "production" ? undefined : process.env.VERIFICATION_PUBLIC_ORIGIN);
}
export async function sendAuthEmail(input: { to: string; subject: string; path: string; action: string; expires: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  const base = origin();
  if (!apiKey || !from || !base) return "not_configured" as const;
  const url = new URL(input.path, base).toString();
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: input.to, subject: input.subject, html: `<main style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h1>BlockSystem</h1><p>Use the secure link below to ${input.action}.</p><p><a href="${url}">Continue securely</a></p><p>This link expires at ${new Date(input.expires).toUTCString()}. If you did not request this, you can ignore this email.</p></main>` }), cache: "no-store", signal: AbortSignal.timeout(10000) });
  return response.ok ? "sent" as const : "failed" as const;
}
