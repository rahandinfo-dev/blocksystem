import type { Metadata } from "next";
import { lookup } from "@/lib/verification-service";
import { validToken } from "@/lib/verification";
import { verificationStore } from "@/lib/verification-store";
import { VerificationView } from "./verification-view";
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
    return <VerificationView record={null} unavailable={false} />;
  let record = null;
  let unavailable = false;
  try {
    record = await lookup(verificationStore(), token);
  } catch {
    unavailable = true;
  }
  return <VerificationView record={record} unavailable={unavailable} />;
}
