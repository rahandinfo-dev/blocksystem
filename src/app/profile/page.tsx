import { ProfilePanel } from "@/components/auth/profile-panel";
import { requestUser } from "@/lib/request-auth";
import type { SafeUser } from "@/lib/auth-types";
import { verificationStore } from "@/lib/verification-store";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
export default async function ProfilePage() {
  let user: SafeUser | null = null;
  try {
    const request = new Request("http://internal/profile", { headers: { cookie: (await cookies()).toString() } });
    user = await requestUser(verificationStore(), request);
  } catch { /* fail closed below */ }
  if (!user) redirect("/login?next=/profile");
  return <ProfilePanel />;
}
