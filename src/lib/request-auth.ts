import { authenticatedUser, canAccessProject, grantProjectAccess, hasPermission } from "./auth.ts";
import type { Permission, SafeUser } from "./auth-types.ts";
import { authorized as legacyAuthorized } from "./verification-auth.ts";
import type { VerificationStore } from "./verification-store.ts";

/**
 * Transitional authorization for Phase 6/7 administration.
 * The legacy verification-admin session remains a SUPER_ADMIN-equivalent path
 * only so existing deployments can migrate without losing document access.
 */
export async function requestUser(store: VerificationStore, request: Request): Promise<SafeUser | null> {
  try { return await authenticatedUser(store, request); } catch { return null; }
}

export async function permits(store: VerificationStore, request: Request, permission: Permission) {
  try { if (legacyAuthorized(request)) return true; } catch { /* Legacy configuration is optional after migration. */ }
  const user = await requestUser(store, request);
  return Boolean(user && hasPermission(user.role, permission));
}

export async function permitsProject(store: VerificationStore, request: Request, projectId: string, permission: Permission) {
  try { if (legacyAuthorized(request)) return true; } catch { /* handled by application sessions */ }
  const user = await requestUser(store, request);
  return Boolean(user && hasPermission(user.role, permission) && await canAccessProject(store, user, projectId));
}

export async function assignProjectToRequestUser(store: VerificationStore, request: Request, projectId: string) {
  const user = await requestUser(store, request);
  if (user && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") await grantProjectAccess(store, projectId, user.id);
}
