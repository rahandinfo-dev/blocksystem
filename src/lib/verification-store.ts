import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { VerificationRecord } from "./verification.ts";
import type { AuditEvent } from "./audit.ts";
import { redisRestEnvironment, verificationEnvironment } from "./server-env.ts";

/** Only this adapter handles persistence. Production uses an external Redis REST service. */
export interface VerificationStore {
  ping(): Promise<void>;
  authGet(key: string): Promise<string | null>;
  authSet(key: string, value: string): Promise<void>;
  authSetIfAbsent(key: string, value: string): Promise<boolean>;
  authCreateUser(input: { emailKey: string; usernameKey: string; userKey: string; usersKey: string; userId: string; value: string }): Promise<"created" | "email_taken" | "username_taken">;
  authDeleteUser(input: { emailKey: string; usernameKey: string; userKey: string; usersKey: string; userId: string }): Promise<void>;
  authCompareAndSet(key: string, expected: string, value: string): Promise<boolean>;
  authDelete(key: string): Promise<void>;
  authMembers(key: string): Promise<string[]>;
  authAddMember(key: string, member: string): Promise<void>;
  authRemoveMember(key: string, member: string): Promise<void>;
  next(prefix: string): Promise<number>;
  get(token: string): Promise<VerificationRecord | null>;
  list(projectId: string): Promise<VerificationRecord[]>;
  create(record: VerificationRecord): Promise<boolean>;
  revoke(token: string): Promise<VerificationRecord | null>;
  rateLimit(key: string, limit: number, seconds: number): Promise<boolean>;
  appendAudit(event: AuditEvent): Promise<void>;
  listAudit(limit: number): Promise<AuditEvent[]>;
}
export class RedisVerificationStore implements VerificationStore {
  private readonly url: string;
  private readonly secret: string;
  constructor(url: string, secret: string) {
    this.url = url;
    this.secret = secret;
  }
  private async command<T>(...command: Array<string | number>): Promise<T> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Verification store unavailable");
    const body = (await response.json()) as { result: T; error?: string };
    if (body.error) throw new Error("Verification store unavailable");
    return body.result;
  }
  async ping() {
    const result = await this.command<string>("PING");
    if (result !== "PONG") throw new Error("Verification store unavailable");
  }
  async authGet(key: string) { return this.command<string | null>("GET", key); }
  async authSet(key: string, value: string) { await this.command<string>("SET", key, value); }
  async authSetIfAbsent(key: string, value: string) { return (await this.command<string | null>("SET", key, value, "NX")) === "OK"; }
  async authCreateUser(input: { emailKey: string; usernameKey: string; userKey: string; usersKey: string; userId: string; value: string }) {
    const result = await this.command<number>(
      "EVAL",
      "local emailOwner=redis.call('GET',KEYS[1]); if emailOwner then if redis.call('EXISTS',ARGV[4]..emailOwner)==0 then redis.call('DEL',KEYS[1]) else return 1 end end; local usernameOwner=redis.call('GET',KEYS[2]); if usernameOwner then if redis.call('EXISTS',ARGV[4]..usernameOwner)==0 then redis.call('DEL',KEYS[2]) else return 2 end end; redis.call('SET',KEYS[1],ARGV[1]); redis.call('SET',KEYS[2],ARGV[1]); redis.call('SET',KEYS[3],ARGV[2]); redis.call('SADD',KEYS[4],ARGV[1]); return 0",
      4, input.emailKey, input.usernameKey, input.userKey, input.usersKey,
      input.userId, input.value, input.userKey.slice(0, -input.userId.length),
    );
    return result === 0 ? "created" : result === 1 ? "email_taken" : "username_taken";
  }
  async authDeleteUser(input: { emailKey: string; usernameKey: string; userKey: string; usersKey: string; userId: string }) {
    await this.command<number>("EVAL", "if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('DEL',KEYS[1]) end; if redis.call('GET',KEYS[2])==ARGV[1] then redis.call('DEL',KEYS[2]) end; redis.call('DEL',KEYS[3]); redis.call('SREM',KEYS[4],ARGV[1]); return 1", 4, input.emailKey, input.usernameKey, input.userKey, input.usersKey, input.userId);
  }
  async authCompareAndSet(key: string, expected: string, value: string) { return (await this.command<number>("EVAL", "if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('SET',KEYS[1],ARGV[2]); return 1 end return 0", 1, key, expected, value)) === 1; }
  async authDelete(key: string) { await this.command<number>("DEL", key); }
  async authMembers(key: string) { return this.command<string[]>("SMEMBERS", key); }
  async authAddMember(key: string, member: string) { await this.command<number>("SADD", key, member); }
  async authRemoveMember(key: string, member: string) { await this.command<number>("SREM", key, member); }
  next(prefix: string) {
    return this.command<number>("INCR", `bs:verify:sequence:${prefix}`);
  }
  async get(token: string) {
    const raw = await this.command<string | null>(
      "GET",
      `bs:verify:record:${token}`,
    );
    return raw ? (JSON.parse(raw) as VerificationRecord) : null;
  }
  async list(projectId: string) {
    const tokens = await this.command<string[]>(
      "SMEMBERS",
      `bs:verify:project:${projectId}`,
    );
    return (await Promise.all(tokens.map((value) => this.get(value)))).filter(
      (record): record is VerificationRecord => record !== null,
    );
  }
  async create(record: VerificationRecord) {
    const result = await this.command<number>(
      "EVAL",
      "if redis.call('EXISTS',KEYS[1])==1 or redis.call('EXISTS',KEYS[3])==1 or (ARGV[3]=='project' and redis.call('EXISTS',KEYS[4])==1) then return 0 end redis.call('SET',KEYS[1],ARGV[1]); redis.call('SADD',KEYS[2],ARGV[2]); redis.call('SET',KEYS[3],ARGV[2]); if ARGV[3]=='project' then redis.call('SET',KEYS[4],ARGV[2]) end return 1",
      4,
      `bs:verify:record:${record.verificationToken}`,
      `bs:verify:project:${record.projectId}`,
      `bs:verify:reference:${record.documentReference}`,
      `bs:verify:identity:${record.projectId}`,
      JSON.stringify(record),
      record.verificationToken,
      record.kind,
    );
    return result === 1;
  }
  async revoke(token: string) {
    const raw = await this.command<string | null>(
      "EVAL",
      "local v=redis.call('GET',KEYS[1]); if not v then return nil end local r=cjson.decode(v); if r.status~='revoked' then r.status='revoked'; r.revokedAt=ARGV[1]; v=cjson.encode(r); redis.call('SET',KEYS[1],v) end return v",
      1,
      `bs:verify:record:${token}`,
      new Date().toISOString(),
    );
    return raw ? (JSON.parse(raw) as VerificationRecord) : null;
  }
  async rateLimit(key: string, limit: number, seconds: number) {
    const count = await this.command<number>(
      "EVAL",
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end return n",
      1,
      `bs:rate:${key}`,
      seconds,
    );
    return count <= limit;
  }
  async appendAudit(event: AuditEvent) {
    await this.command<number>(
      "LPUSH",
      "bs:audit:events",
      JSON.stringify(event),
    );
    await this.command<number>("LTRIM", "bs:audit:events", 0, 9999);
  }
  async listAudit(limit: number) {
    const raw = await this.command<string[]>(
      "LRANGE",
      "bs:audit:events",
      0,
      Math.max(0, Math.min(limit, 200) - 1),
    );
    return raw
      .map((value) => JSON.parse(value) as AuditEvent)
      .filter(
        (value) =>
          value &&
          typeof value.id === "string" &&
          typeof value.action === "string",
      );
  }
}
type LocalData = {
  sequences: Record<string, number>;
  records: VerificationRecord[];
  audit: AuditEvent[];
  rate: Record<string, { count: number; expiresAt: number }>;
  auth?: Record<string, string>;
  authSets?: Record<string, string[]>;
};
let pending: Promise<unknown> = Promise.resolve();
/** Explicit local development/test adapter, never selected on Vercel or in production. */
export class FileVerificationStore implements VerificationStore {
  private readonly directory: string;
  constructor(directory: string) {
    this.directory = directory;
  }
  private transaction<T>(
    fn: (data: LocalData) => T,
    write = false,
  ): Promise<T> {
    const operation = pending
      .catch(() => {})
      .then(async () => {
        await mkdir(this.directory, { recursive: true });
        const file = join(this.directory, "records.json");
        let data: LocalData;
        try {
          data = JSON.parse(await readFile(file, "utf8")) as LocalData;
          data.audit ??= [];
          data.rate ??= {};
          data.sequences ??= {};
          data.records ??= [];
          data.auth ??= {};
          data.authSets ??= {};
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          data = { sequences: {}, records: [], audit: [], rate: {}, auth: {}, authSets: {} };
        }
        const result = fn(data);
        if (write) {
          const temp = join(this.directory, `${randomUUID()}.tmp`);
          await writeFile(temp, JSON.stringify(data), { mode: 0o600 });
          await rename(temp, file);
        }
        return result;
      });
    pending = operation;
    return operation;
  }
  async ping() {
    await this.transaction(() => undefined);
  }
  authGet(key: string) { return this.transaction((data) => data.auth?.[key] ?? null); }
  authSet(key: string, value: string) { return this.transaction((data) => { (data.auth ??= {})[key] = value; }, true); }
  authSetIfAbsent(key: string, value: string) { return this.transaction((data) => { const auth = (data.auth ??= {}); if (auth[key] !== undefined) return false; auth[key] = value; return true; }, true); }
  authCreateUser(input: { emailKey: string; usernameKey: string; userKey: string; usersKey: string; userId: string; value: string }) {
    return this.transaction((data) => {
      const auth = (data.auth ??= {});
      const prefix = input.userKey.slice(0, -input.userId.length);
      const owner = (key: string) => auth[key];
      const clearOrphan = (key: string) => {
        const id = owner(key);
        if (id && auth[`${prefix}${id}`] === undefined) delete auth[key];
      };
      clearOrphan(input.emailKey);
      if (owner(input.emailKey)) return "email_taken" as const;
      clearOrphan(input.usernameKey);
      if (owner(input.usernameKey)) return "username_taken" as const;
      auth[input.emailKey] = input.userId;
      auth[input.usernameKey] = input.userId;
      auth[input.userKey] = input.value;
      const users = ((data.authSets ??= {})[input.usersKey] ??= []);
      if (!users.includes(input.userId)) users.push(input.userId);
      return "created" as const;
    }, true);
  }
  authDeleteUser(input: { emailKey: string; usernameKey: string; userKey: string; usersKey: string; userId: string }) {
    return this.transaction((data) => {
      const auth = (data.auth ??= {});
      if (auth[input.emailKey] === input.userId) delete auth[input.emailKey];
      if (auth[input.usernameKey] === input.userId) delete auth[input.usernameKey];
      delete auth[input.userKey];
      const users = (data.authSets ??= {})[input.usersKey];
      if (users) data.authSets![input.usersKey] = users.filter((id) => id !== input.userId);
    }, true);
  }
  authCompareAndSet(key: string, expected: string, value: string) { return this.transaction((data) => { const auth = (data.auth ??= {}); if (auth[key] !== expected) return false; auth[key] = value; return true; }, true); }
  authDelete(key: string) { return this.transaction((data) => { delete (data.auth ?? {})[key]; }, true); }
  authMembers(key: string) { return this.transaction((data) => [...(data.authSets?.[key] ?? [])]); }
  authAddMember(key: string, member: string) { return this.transaction((data) => { const set = ((data.authSets ??= {})[key] ??= []); if (!set.includes(member)) set.push(member); }, true); }
  authRemoveMember(key: string, member: string) { return this.transaction((data) => { const set = (data.authSets ??= {})[key]; if (set) data.authSets![key] = set.filter((item) => item !== member); }, true); }
  next(prefix: string) {
    return this.transaction(
      (data) => (data.sequences[prefix] = (data.sequences[prefix] ?? 0) + 1),
      true,
    );
  }
  get(token: string) {
    return this.transaction(
      (data) => data.records.find((r) => r.verificationToken === token) ?? null,
    );
  }
  list(projectId: string) {
    return this.transaction((data) =>
      data.records.filter((r) => r.projectId === projectId),
    );
  }
  create(record: VerificationRecord) {
    return this.transaction((data) => {
      if (
        data.records.some(
          (r) =>
            r.verificationToken === record.verificationToken ||
            r.documentReference === record.documentReference ||
            (record.kind === "project" &&
              r.kind === "project" &&
              r.projectId === record.projectId),
        )
      )
        return false;
      data.records.push(record);
      return true;
    }, true);
  }
  revoke(token: string) {
    return this.transaction((data) => {
      const record = data.records.find((r) => r.verificationToken === token);
      if (record && record.status !== "revoked") {
        record.status = "revoked";
        record.revokedAt = new Date().toISOString();
      }
      return record ?? null;
    }, true);
  }
  rateLimit(key: string, limit: number, seconds: number) {
    return this.transaction((data) => {
      const now = Date.now();
      for (const [candidate, value] of Object.entries(data.rate))
        if (value.expiresAt <= now) delete data.rate[candidate];
      const current = data.rate[key];
      const entry = !current
        ? { count: 0, expiresAt: now + seconds * 1000 }
        : current;
      entry.count += 1;
      data.rate[key] = entry;
      return entry.count <= limit;
    }, true);
  }
  appendAudit(event: AuditEvent) {
    return this.transaction((data) => {
      data.audit.unshift(event);
      data.audit = data.audit.slice(0, 10000);
    }, true);
  }
  listAudit(limit: number) {
    return this.transaction((data) =>
      data.audit.slice(0, Math.max(0, Math.min(limit, 200))),
    );
  }
}
export function verificationStore(): VerificationStore {
  const config = verificationEnvironment();
  if (config.redisUrl && config.redisToken)
    return new RedisVerificationStore(config.redisUrl, config.redisToken);
  if (
    !process.env.VERCEL &&
    process.env.NODE_ENV !== "production" &&
    process.env.VERIFICATION_DEV_DIRECTORY
  )
    return new FileVerificationStore(
      resolve(process.env.VERIFICATION_DEV_DIRECTORY),
    );
  // Keep local development explicit, but return a safe configuration category
  // in production instead of coupling storage to the legacy admin secret.
  const redis = redisRestEnvironment();
  return new RedisVerificationStore(redis.url, redis.token);
}
