"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { roles, type Role, type SafeUser } from "@/lib/auth-types";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "./auth-provider";

export function UsersPanel() {
  const { t, direction } = useI18n();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", displayName: "", password: "", role: "VIEWER" as Role });
  const load = useCallback(async () => {
    const response = await fetch("/api/auth/users", { cache: "no-store" });
    if (!response.ok) { setMessage(t(response.status === 403 ? "auth.forbidden" : "reliability.serviceUnavailable")); return; }
    setUsers((await response.json() as { users: SafeUser[] }).users);
  }, [t]);
  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/admin/users");
    else if (user) { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }
  }, [load, loading, router, user]);
  if (loading || !user) return <main className="pwa-loading" dir={direction} role="status">{t("auth.loading")}</main>;
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!response.ok) { setMessage(t(response.status === 403 ? "auth.forbidden" : "reliability.serviceUnavailable")); return; }
      setForm({ email: "", displayName: "", password: "", role: "VIEWER" }); await load();
    } finally { setBusy(false); }
  };
  const update = async (event: React.FormEvent<HTMLFormElement>, item: SafeUser) => {
    event.preventDefault(); const values = new FormData(event.currentTarget); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/auth/users/${encodeURIComponent(item.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: values.get("displayName"), role: values.get("role"), status: values.get("status") }) });
      if (!response.ok) { setMessage(t(response.status === 403 ? "auth.forbidden" : "reliability.serviceUnavailable")); return; }
      await load();
    } finally { setBusy(false); }
  };
  return <main className="mx-auto w-full max-w-5xl p-4 sm:p-8" dir={direction}>
    <div className="rounded-2xl border bg-white p-4 sm:p-6">
      <h1 className="text-2xl font-bold">{t("auth.users")}</h1>
      {message ? <p role="alert" className="mt-3 text-sm text-red-700">{message}</p> : null}
      <form onSubmit={create} className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">{t("auth.email")}<input className="form-control" dir="ltr" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
        <label className="grid gap-1 text-sm">{t("auth.displayName")}<input className="form-control" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required /></label>
        <label className="grid gap-1 text-sm">{t("auth.password")}<input className="form-control" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={12} /></label>
        <label className="grid gap-1 text-sm">{t("auth.role")}<select className="form-control" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
        <button disabled={busy} className="min-h-11 rounded-lg bg-[var(--brand-navy)] px-4 font-bold text-[var(--brand-cream)] disabled:opacity-60 sm:col-span-2">{t("auth.createUser")}</button>
      </form>
      <div className="mt-6 grid gap-3">{users.map((item) => <article key={item.id} className="rounded-lg border p-3">
        <form onSubmit={(event) => void update(event, item)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1 text-sm">{t("auth.displayName")}<input className="form-control" name="displayName" defaultValue={item.displayName} required /></label>
          <p className="self-end break-all text-sm" dir="ltr">{item.email}</p>
          <label className="grid gap-1 text-sm">{t("auth.role")}<select className="form-control" name="role" defaultValue={item.role}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
          <label className="grid gap-1 text-sm">{t("auth.status")}<select className="form-control" name="status" defaultValue={item.status}><option value="ACTIVE">{t("auth.active")}</option><option value="DISABLED">{t("auth.disabled")}</option></select></label>
          <button disabled={busy} className="min-h-11 rounded-lg border px-3 font-semibold disabled:opacity-60 lg:col-span-4">{t("auth.updateUser")}</button>
        </form>
      </article>)}</div>
      <Link className="mt-5 inline-block text-sm underline" href="/">{t("auth.returnHome")}</Link>
    </div>
  </main>;
}
