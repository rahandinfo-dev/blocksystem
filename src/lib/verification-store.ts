import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { VerificationRecord } from "./verification.ts";

/** Only this adapter handles persistence. Production uses an external Redis REST service. */
export interface VerificationStore {
  next(prefix: string): Promise<number>;
  get(token: string): Promise<VerificationRecord | null>;
  list(projectId: string): Promise<VerificationRecord[]>;
  create(record: VerificationRecord): Promise<boolean>;
  revoke(token: string): Promise<VerificationRecord | null>;
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
}
type LocalData = {
  sequences: Record<string, number>;
  records: VerificationRecord[];
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
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          data = { sequences: {}, records: [] };
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
}
export function verificationStore(): VerificationStore {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const secret = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && secret && new URL(url).protocol === "https:")
    return new RedisVerificationStore(url, secret);
  if (
    !process.env.VERCEL &&
    process.env.NODE_ENV !== "production" &&
    process.env.VERIFICATION_DEV_DIRECTORY
  )
    return new FileVerificationStore(
      resolve(process.env.VERIFICATION_DEV_DIRECTORY),
    );
  throw new Error("Verification store unavailable");
}
