"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./auth-provider";
import { useI18n } from "@/lib/i18n";
export function ProfilePanel() {
  const { t, direction } = useI18n(); const { user, loading, refresh } = useAuth(); const router = useRouter(); const [name, setName] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => { if (!loading && !user) router.replace("/login?next=/profile"); }, [loading, router, user]);
  if (loading || !user) return <main className="pwa-loading" dir={direction} role="status">{t("auth.loading")}</main>;
  const save = async () => { const response = await fetch("/api/auth/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: name || user.displayName }) }); if (response.ok) { await refresh(); setMessage(t("common.save")); } else setMessage(t("reliability.serviceUnavailable")); };
  return <main className="pwa-offline-page" dir={direction}><section><h1>{t("auth.profile")}</h1><p dir="ltr"><bdi>{user.email}</bdi></p><p>{t("auth.role")}: <bdi dir="ltr">{user.role}</bdi></p><label className="mt-4 grid gap-1 text-sm font-semibold">{t("auth.displayName")}<input className="form-control" defaultValue={user.displayName} onChange={(event) => setName(event.target.value)} /></label><button type="button" className="mt-4 min-h-11 rounded-lg bg-[var(--brand-navy)] px-4 font-bold text-[var(--brand-cream)]" onClick={() => void save()}>{t("common.save")}</button>{message ? <p role="status" className="mt-3 text-sm">{message}</p> : null}<Link className="mt-5 inline-block text-sm underline" href="/">{t("auth.returnHome")}</Link></section></main>;
}
