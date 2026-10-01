import { createHmac, randomBytes, randomUUID, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { VerificationStore } from "./verification-store.ts";
import { permissions, roles, toSafeUser, type AuthSession, type Permission, type Role, type SafeUser, type User } from "./auth-types.ts";
import { normalizeEmail, normalizeUsername, validEmail, validUsername } from "./identity.ts";
import { passwordRequirements } from "./password-policy.ts";

const scrypt = promisify(nodeScrypt) as (password: string, salt: string, keyLength: number, options: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;
const userKey = (id: string) => `bs:auth:user:${id}`;
const emailKey = (email: string) => `bs:auth:email:${email}`;
const usernameKey = (username: string) => `bs:auth:username:${username}`;
const sessionKey = (id: string) => `bs:auth:session:${id}`;
const userIndex = "bs:auth:users";
const projectMembersKey = (projectId: string) => `bs:auth:project:${projectId}:members`;
const sessionName = "bs-auth-session";
const sessionHours = 12;
export type AuthEnvironment = { sessionSecret: string; bootstrapEmail?: string; bootstrapPassword?: string };
export function authEnvironment(env: NodeJS.ProcessEnv = process.env): AuthEnvironment {
  for (const name of ["AUTH_SESSION_SECRET", "AUTH_BOOTSTRAP_SUPER_ADMIN_PASSWORD"])
    if (env[`NEXT_PUBLIC_${name}`]) throw new Error("Authentication secret is publicly configured");
  const sessionSecret = env.AUTH_SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) throw new Error("Authentication configuration is incomplete");
  const bootstrapEmail = env.AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const bootstrapPassword = env.AUTH_BOOTSTRAP_SUPER_ADMIN_PASSWORD;
  if ((bootstrapEmail && !bootstrapPassword) || (!bootstrapEmail && bootstrapPassword) || (bootstrapEmail && !validEmail(bootstrapEmail))) throw new Error("Authentication bootstrap configuration is invalid");
  if (bootstrapPassword && bootstrapPassword.length < 12) throw new Error("Authentication bootstrap configuration is invalid");
  return { sessionSecret, bootstrapEmail, bootstrapPassword };
}
export { normalizeEmail, normalizeUsername, validEmail, validUsername } from "./identity.ts";
export function validPassword(value: string) { return passwordRequirements(value).valid; }
export function hasPermission(role: Role, permission: Permission) { return permissions[role].includes(permission); }
export function hasRole(role: Role, ...allowed: Role[]) { return allowed.includes(role); }
export async function hashPassword(password: string) {
  if (!validPassword(password)) throw new Error("Invalid password");
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt}$${derived.toString("hex")}`;
}
export async function passwordMatches(password: string, encoded: string) {
  const [algorithm, n, r, p, salt, hash] = encoded.split("$");
  if (algorithm !== "scrypt" || n !== "16384" || r !== "8" || p !== "1" || !salt || !/^[a-f0-9]{128}$/i.test(hash ?? "")) return false;
  const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(derived, Buffer.from(hash, "hex"));
}
function validId(value: string) { return /^[a-f0-9-]{36}$/i.test(value); }
function safeUserRecord(raw: string | null): User | null {
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as Partial<User>;
    if (!user || typeof user !== "object" || !validId(String(user.id)) || !validEmail(String(user.email)) || typeof user.displayName !== "string" || !roles.includes(user.role as Role) || !["ACTIVE", "DISABLED"].includes(String(user.status)) || typeof user.passwordHash !== "string" || typeof user.createdAt !== "string" || typeof user.updatedAt !== "string") return null;
    user.username = validUsername(normalizeUsername(String(user.username ?? ""))) ? normalizeUsername(String(user.username)) : `legacy-${String(user.id).replace(/-/g, "").slice(0, 12)}`;
    if (user.emailVerificationRequired === undefined) user.emailVerifiedAt ??= user.createdAt;
    return user as User;
  } catch { return null; }
}
async function getUserRecord(store: VerificationStore, id: string) { return validId(id) ? safeUserRecord(await store.authGet(userKey(id))) : null; }
export async function getUserByEmail(store: VerificationStore, email: string) { const id = await store.authGet(emailKey(normalizeEmail(email))); return id ? getUserRecord(store, id) : null; }
export async function getUserByUsername(store: VerificationStore, username: string) { const id = await store.authGet(usernameKey(normalizeUsername(username))); return id ? getUserRecord(store, id) : null; }
export async function getUserByIdentifier(store: VerificationStore, identifier: string) { return identifier.includes("@") ? getUserByEmail(store, identifier) : getUserByUsername(store, identifier); }
export async function getUser(store: VerificationStore, id: string) { return getUserRecord(store, id); }
export async function listUsers(store: VerificationStore): Promise<SafeUser[]> { return (await Promise.all((await store.authMembers(userIndex)).map((id) => getUserRecord(store, id)))).filter((user): user is User => Boolean(user)).map(toSafeUser).sort((a, b) => a.createdAt.localeCompare(b.createdAt)); }
export async function createUser(store: VerificationStore, input: { email: string; username?: string; displayName: string; password: string; role: Role; emailVerified?: boolean }): Promise<SafeUser> {
  const id = randomUUID(); const email = normalizeEmail(input.email); const displayName = input.displayName.trim().slice(0, 120); const username = normalizeUsername(input.username ?? `user-${id.replace(/-/g, "").slice(0, 12)}`);
  if (!validEmail(email) || !validUsername(username) || !displayName || !roles.includes(input.role)) throw new Error("Invalid user");
  const passwordHash = await hashPassword(input.password);
  if (!(await store.authSetIfAbsent(emailKey(email), id))) throw new Error("User exists");
  if (!(await store.authSetIfAbsent(usernameKey(username), id))) { await store.authDelete(emailKey(email)); throw new Error("Username exists"); }
  const now = new Date().toISOString();
  const user: User = { id, email, username, displayName, role: input.role, status: "ACTIVE", passwordHash, ...(input.emailVerified ? { emailVerifiedAt: now } : { emailVerificationRequired: true }), createdAt: now, updatedAt: now };
  try {
    await store.authSet(userKey(id), JSON.stringify(user));
    await store.authAddMember(userIndex, id);
  } catch (error) {
    await store.authDelete(emailKey(email)); await store.authDelete(usernameKey(username));
    throw error;
  }
  return toSafeUser(user);
}
export async function deleteUser(store: VerificationStore, id: string) {
  const user = await getUserRecord(store, id);
  if (!user) return false;
  await store.authDelete(emailKey(user.email));
  await store.authDelete(usernameKey(user.username));
  await store.authDelete(userKey(user.id));
  await store.authRemoveMember(userIndex, user.id);
  return true;
}
export async function updateUser(store: VerificationStore, id: string, patch: { displayName?: string; role?: Role; status?: User["status"] }): Promise<SafeUser | null> {
  const user = await getUserRecord(store, id); if (!user) return null;
  if (patch.displayName !== undefined) { const displayName = patch.displayName.trim().slice(0, 120); if (!displayName) throw new Error("Invalid user"); user.displayName = displayName; }
  if (patch.role !== undefined) { if (!roles.includes(patch.role)) throw new Error("Invalid user"); user.role = patch.role; }
  if (patch.status !== undefined) { if (!["ACTIVE", "DISABLED"].includes(patch.status)) throw new Error("Invalid user"); user.status = patch.status; }
  user.updatedAt = new Date().toISOString(); await store.authSet(userKey(id), JSON.stringify(user)); return toSafeUser(user);
}
export async function verifyUserEmail(store: VerificationStore, id: string) {
  const user = await getUserRecord(store, id); if (!user) return null;
  user.emailVerifiedAt = new Date().toISOString(); user.updatedAt = user.emailVerifiedAt;
  user.emailVerificationRequired = false;
  await store.authSet(userKey(id), JSON.stringify(user)); return toSafeUser(user);
}
export async function resetUserPassword(store: VerificationStore, id: string, password: string) {
  const user = await getUserRecord(store, id); if (!user) return false;
  user.passwordHash = await hashPassword(password); user.updatedAt = new Date().toISOString();
  await store.authSet(userKey(id), JSON.stringify(user));
  return true;
}
export async function ensureBootstrapSuperAdmin(store: VerificationStore, env = authEnvironment()) {
  if (!env.bootstrapEmail || !env.bootstrapPassword) return null;
  const existing = await getUserByEmail(store, env.bootstrapEmail);
  return existing ? toSafeUser(existing) : createUser(store, { email: env.bootstrapEmail, username: "bootstrap-admin", displayName: "Super administrator", password: env.bootstrapPassword, role: "SUPER_ADMIN", emailVerified: true });
}
/** Existing projects remain accessible until explicitly assigned; newly issued records are assigned. */
export async function grantProjectAccess(store: VerificationStore, projectId: string, userId: string) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(projectId) || !validId(userId)) throw new Error("Invalid project access");
  await store.authAddMember(projectMembersKey(projectId), userId);
}
export async function revokeProjectAccess(store: VerificationStore, projectId: string, userId: string) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(projectId) || !validId(userId)) throw new Error("Invalid project access");
  await store.authRemoveMember(projectMembersKey(projectId), userId);
}
export async function canAccessProject(store: VerificationStore, user: SafeUser, projectId: string) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(projectId) || !hasPermission(user.role, "projects.read")) return false;
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") return true;
  const members = await store.authMembers(projectMembersKey(projectId));
  return members.length === 0 || members.includes(user.id);
}
function sign(value: string, secret: string) { return createHmac("sha256", secret).update(value).digest("hex"); }
export async function createSession(store: VerificationStore, user: User, secret = authEnvironment().sessionSecret) {
  const now = Date.now(); const session: AuthSession = { id: randomUUID(), userId: user.id, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + sessionHours * 3600000).toISOString() };
  await store.authSet(sessionKey(session.id), JSON.stringify(session));
  return `${sessionName}=${session.id}.${sign(session.id, secret)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${sessionHours * 3600}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
function readCookie(request: Request) { return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${sessionName}=`))?.slice(sessionName.length + 1) ?? ""; }
export async function authenticatedUser(store: VerificationStore, request: Request, secret = authEnvironment().sessionSecret): Promise<SafeUser | null> {
  const [id, signature] = readCookie(request).split(".");
  if (!id || !/^[a-f0-9-]{36}$/i.test(id) || !/^[a-f0-9]{64}$/i.test(signature ?? "")) return null;
  const expected = sign(id, secret); if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const raw = await store.authGet(sessionKey(id)); if (!raw) return null;
  let session: AuthSession;
  try { session = JSON.parse(raw) as AuthSession; } catch { return null; }
  if (!validId(session.id) || !validId(session.userId) || session.revokedAt || !Number.isFinite(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= Date.now()) return null;
  const user = await getUserRecord(store, session.userId); return user?.status === "ACTIVE" ? toSafeUser(user) : null;
}
export async function revokeSession(store: VerificationStore, request: Request) { const [id] = readCookie(request).split("."); if (id) await store.authDelete(sessionKey(id)); }
export function clearSessionCookie() { return `${sessionName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`; }
