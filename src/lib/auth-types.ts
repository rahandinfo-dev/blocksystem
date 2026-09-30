export const roles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "ENGINEER", "VIEWER"] as const;
export type Role = (typeof roles)[number];
export type AccountStatus = "ACTIVE" | "DISABLED";
export type Permission =
  | "users.read" | "users.create" | "users.update" | "users.disable"
  | "projects.read" | "projects.create" | "projects.update" | "projects.delete"
  | "documents.read" | "documents.create" | "documents.revoke"
  | "reports.generate" | "verification.read" | "verification.manage"
  | "backups.create" | "backups.restore" | "audit.read" | "system.health.read" | "system.admin";
export type User = { id: string; email: string; username: string; displayName: string; role: Role; status: AccountStatus; passwordHash: string; emailVerifiedAt?: string; emailVerificationRequired?: boolean; createdAt: string; updatedAt: string };
export type SafeUser = Omit<User, "passwordHash">;
export type AuthSession = { id: string; userId: string; createdAt: string; expiresAt: string; revokedAt?: string };
export const permissions: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: ["users.read","users.create","users.update","users.disable","projects.read","projects.create","projects.update","projects.delete","documents.read","documents.create","documents.revoke","reports.generate","verification.read","verification.manage","backups.create","backups.restore","audit.read","system.health.read","system.admin"],
  ADMIN: ["users.read","users.create","users.update","projects.read","projects.create","projects.update","projects.delete","documents.read","documents.create","documents.revoke","reports.generate","verification.read","verification.manage","backups.create","backups.restore","audit.read","system.health.read"],
  MANAGER: ["projects.read","projects.create","projects.update","documents.read","documents.create","reports.generate","verification.read","backups.create"],
  ENGINEER: ["projects.read","projects.create","projects.update","documents.read","documents.create","reports.generate","verification.read","backups.create"],
  VIEWER: ["projects.read","documents.read","reports.generate","verification.read"],
};
export function toSafeUser(user: User): SafeUser { return { id: user.id, email: user.email, username: user.username, displayName: user.displayName, role: user.role, status: user.status, emailVerifiedAt: user.emailVerifiedAt, emailVerificationRequired: user.emailVerificationRequired, createdAt: user.createdAt, updatedAt: user.updatedAt }; }
