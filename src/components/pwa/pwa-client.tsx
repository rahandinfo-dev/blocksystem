"use client";

import { Download, RefreshCw, WifiOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const installDismissedKey = "blocksystem:pwa-install-dismissed:v1";

export function PwaClient() {
  const { t, direction } = useI18n();
  const [offline, setOffline] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(true);

  useEffect(() => {
    const initialize = window.setTimeout(() => {
      setOffline(!navigator.onLine);
      setInstallDismissed(window.localStorage.getItem(installDismissedKey) === "1");
    }, 0);
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const installed = () => setInstallPrompt(null);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => {
        if (registration.waiting) setUpdateReady(true);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(true);
          });
        });
      }).catch(() => undefined);
      const controllerChanged = () => window.location.reload();
      navigator.serviceWorker.addEventListener("controllerchange", controllerChanged);
      return () => {
        window.clearTimeout(initialize);
        window.removeEventListener("offline", goOffline);
        window.removeEventListener("online", goOnline);
        window.removeEventListener("beforeinstallprompt", beforeInstall);
        window.removeEventListener("appinstalled", installed);
        navigator.serviceWorker.removeEventListener("controllerchange", controllerChanged);
      };
    }
    return () => {
      window.clearTimeout(initialize);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };
  const update = () => {
    navigator.serviceWorker.getRegistration().then((registration) => {
      registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
    }).catch(() => undefined);
  };
  const dismissInstall = () => {
    window.localStorage.setItem(installDismissedKey, "1");
    setInstallDismissed(true);
  };
  const showInstall = Boolean(installPrompt) && !installDismissed;
  if (!offline && !updateReady && !showInstall) return null;
  return (
    <aside className="pwa-notices" dir={direction} aria-live="polite" aria-atomic="true">
      {offline ? <div className="pwa-notice pwa-notice-warning"><WifiOff size={18} aria-hidden="true" /><span>{t("pwa.offline")}</span></div> : null}
      {updateReady ? <div className="pwa-notice"><RefreshCw size={18} aria-hidden="true" /><span>{t("pwa.updateAvailable")}</span><button type="button" onClick={update}>{t("pwa.update")}</button></div> : null}
      {showInstall ? <div className="pwa-notice"><Download size={18} aria-hidden="true" /><span>{t("pwa.installReady")}</span><button type="button" onClick={() => void install()}>{t("pwa.install")}</button><button type="button" aria-label={t("pwa.dismiss")} onClick={dismissInstall}><X size={18} /></button></div> : null}
    </aside>
  );
}
