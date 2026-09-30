"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { SafeUser } from "@/lib/auth-types";
type AuthContextValue = { user: SafeUser | null; loading: boolean; refresh: () => Promise<void>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) { const [user, setUser] = useState<SafeUser | null>(null); const [loading, setLoading] = useState(true); const refresh = useCallback(async () => { try { const response = await fetch("/api/auth/session", { cache: "no-store" }); const body = await response.json() as { user?: SafeUser | null }; setUser(body.user ?? null); } catch { setUser(null); } finally { setLoading(false); } }, []); useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, [refresh]); const signOut = useCallback(async () => { try { await fetch("/api/auth/session", { method: "DELETE" }); } finally { setUser(null); } }, []); return <AuthContext.Provider value={{ user, loading, refresh, signOut }}>{children}</AuthContext.Provider>; }
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }
