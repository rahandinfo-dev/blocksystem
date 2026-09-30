import type { Metadata } from "next";
import { headers } from "next/headers";
import { lookup } from "@/lib/verification-service";
import { validToken } from "@/lib/verification";
import { verificationStore } from "@/lib/verification-store";
import { VerificationView } from "./verification-view";
import { enforceRateLimit } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function Verify({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!validToken(token))
    return <VerificationView key={token} record={null} unavailable={false} />;
  let record = null;
  let unavailable = false;
  try {
    const store = verificationStore();
    const request = new Request("https://verification.internal", {
      headers: await headers(),
    });
    if (!(await enforceRateLimit(store, request, "public"))) unavailable = true;
    else record = await lookup(store, token);
  } catch {
    unavailable = true;
  }
  return (
    <VerificationView key={token} record={record} unavailable={unavailable} />
  );
}
