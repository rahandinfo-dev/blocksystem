import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import { verificationEnvironment } from "./server-env.ts";
const name = "bs-verification-admin";
function secret() {
  const value = verificationEnvironment().adminSecret;
  if (!value || value.length < 32)
    throw new Error("Verification administrator unavailable");
  return value;
}
function equal(a: string, b: string) {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );
}
export function passwordMatches(value: string) {
  return equal(value, secret());
}
export function sessionCookie() {
  const expiry = String(Date.now() + 3600000);
  const signature = createHmac("sha256", secret()).update(expiry).digest("hex");
  return `${name}=${expiry}.${signature}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
export function authorized(request: Request) {
  const session =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? "";
  const [expiry, signature] = session.split(".");
  if (
    !/^\d{13}$/.test(expiry ?? "") ||
    !/^[a-f0-9]{64}$/.test(signature ?? "") ||
    Number(expiry) <= Date.now() ||
    Number(expiry) > Date.now() + 3600000
  )
    return false;
  return equal(
    signature,
    createHmac("sha256", secret()).update(expiry).digest("hex"),
  );
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(request.url).origin;
  if (origin) return origin === expected;
  // Some in-app mobile browsers omit Origin on a same-site POST. Retain CSRF
  // protection by requiring another browser-controlled same-origin signal.
  const referer = request.headers.get("referer");
  if (referer) {
    try { return new URL(referer).origin === expected; } catch { return false; }
  }
  return request.headers.get("sec-fetch-site") === "same-origin";
}
export async function limitedJson(request: Request) {
  const headerLength = request.headers.get("content-length");
  if (
    headerLength !== null &&
    (!/^\d+$/.test(headerLength) || Number(headerLength) > 1000000)
  )
    throw new Error("Invalid input");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Invalid input");
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const item = await reader.read();
    if (item.done) break;
    length += item.value.length;
    if (length > 1000000) {
      await reader.cancel();
      throw new Error("Invalid input");
    }
    chunks.push(item.value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
