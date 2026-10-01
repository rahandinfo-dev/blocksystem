import { verificationEnvironment } from "./server-env.ts";

export type AuthEmailDelivery = "sent" | "not_configured" | "origin_invalid" | "sender_rejected" | "recipient_not_allowed" | "unavailable";
export const verificationEmailSubject = "پشتڕاستکردنەوەی ئیمەیڵی RekApps";
type AuthEmailInput = { to: string; subject: string; path: string; action: string; expires: string; template?: "verification" };

function origin() { return verificationEnvironment().publicOrigin; }
function sender(from: string) { return `RekApps <${from.match(/<([^<>\s]+@[^<>\s]+)>/)?.[1] ?? from.trim()}>`; }
function verificationContent(url: string) {
  const title = "بەخێربێیت بۆ RekApps";
  const body = "بۆ تەواوکردنی دروستکردنی هەژمارەکەت، تکایە ئیمەیڵەکەت پشتڕاست بکەرەوە.";
  const button = "پشتڕاستکردنەوەی ئیمەیڵ";
  const expiry = "ئەم بەستەرە بۆ ماوەی دیاریکراو بەردەستە.";
  const security = "ئەگەر تۆ داوای دروستکردنی ئەم هەژمارەت نەکردووە، دەتوانیت ئەم ئیمەیڵە پشتگوێ بخەیت.";
  return { text: `${title}\n\n${body}\n\n${button}: ${url}\n\n${expiry}\n\n${security}\n\nRekApps`, html: `<!doctype html><html lang="ckb" dir="rtl"><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f4f6f8;color:#14213d;font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8"><tr><td style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dbe2ea;border-radius:16px;overflow:hidden"><tr><td style="padding:28px 28px 12px"><p style="margin:0;color:#0f2053;font-size:14px;font-weight:700">RekApps</p><h1 style="margin:18px 0 14px;font-size:25px;line-height:1.45;color:#0f2053">${title}</h1><p style="margin:0;font-size:16px;line-height:1.9;color:#334155">${body}</p></td></tr><tr><td style="padding:16px 28px 24px"><a href="${url}" style="display:inline-block;background:#0f2053;color:#fffdf5;text-decoration:none;border-radius:9px;padding:14px 22px;font-size:16px;font-weight:700">${button}</a><p style="margin:20px 0 0;font-size:14px;line-height:1.8;color:#475569">${expiry}</p><p style="margin:16px 0 0;padding-top:16px;border-top:1px solid #dbe2ea;font-size:13px;line-height:1.8;color:#64748b">${security}</p></td></tr><tr><td style="padding:16px 28px;background:#f8fafc;color:#475569;font-size:13px;font-weight:700">RekApps</td></tr></table></td></tr></table></body></html>` };
}
function defaultContent(input: AuthEmailInput, url: string) { return { text: `RekApps\n\nUse this secure link to ${input.action}: ${url}\n\nThis link expires at ${new Date(input.expires).toUTCString()}.`, html: `<main style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h1>RekApps</h1><p>Use the secure link below to ${input.action}.</p><p><a href="${url}">Continue securely</a></p><p>This link expires at ${new Date(input.expires).toUTCString()}. If you did not request this, you can ignore this email.</p></main>` }; }
function resendFailureCategory(status: number, body: unknown): AuthEmailDelivery {
  const detail = typeof body === "object" && body ? ["name", "message"].map((key) => (typeof (body as Record<string, unknown>)[key] === "string" ? (body as Record<string, unknown>)[key] : "")).join(" ").toLowerCase() : "";
  if (/(testing email|test mode|own email|only.*(?:send|recipient)|recipient.*(?:allow|permit))/.test(detail)) return "recipient_not_allowed";
  if ((status === 400 || status === 403 || status === 422) && /(from|sender|domain)/.test(detail)) return "sender_rejected";
  return "unavailable";
}
export async function sendAuthEmail(input: AuthEmailInput) {
  const apiKey = process.env.RESEND_API_KEY; const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from) return "not_configured" as const;
  let base: string | undefined;
  try { base = origin(); } catch { return "origin_invalid" as const; }
  if (!base) return "not_configured" as const;
  const url = new URL(input.path, base).toString();
  const content = input.template === "verification" ? verificationContent(url) : defaultContent(input, url);
  const subject = input.template === "verification" ? verificationEmailSubject : input.subject;
  try {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: sender(from), to: input.to, subject, html: content.html, text: content.text }), cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (response.ok) return "sent" as const;
    return resendFailureCategory(response.status, await response.json().catch(() => null));
  } catch { return "unavailable" as const; }
}
