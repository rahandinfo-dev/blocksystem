import { UsersPanel } from "@/components/auth/users-panel";
import { hasPermission } from "@/lib/auth";
import type { SafeUser } from "@/lib/auth-types";
import { requestUser } from "@/lib/request-auth";
import { verificationStore } from "@/lib/verification-store";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
export default async function UsersPage() {
  let user: SafeUser | null = null;
  try {
    const request = new Request("http://internal/admin/users", { headers: { cookie: (await cookies()).toString() } });
    user = await requestUser(verificationStore(), request);
  } catch { /* fail closed below */ }
  if (!user) redirect("/login?next=/admin/users");
  if (!hasPermission(user.role, "users.read")) redirect("/profile?forbidden=1");
  return <UsersPanel />;
}
