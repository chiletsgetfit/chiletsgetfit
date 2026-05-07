"use client";

import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription } from "./actions";

type Status = "loading" | "unsupported" | "default" | "granted" | "denied";

export function PushButton({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as Status);
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      setStatus(permission as Status);
      if (permission !== "granted") {
        setBusy(false);
        return;
      }
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Subscription missing keys.");
      }
      await savePushSubscription({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        userAgent: navigator.userAgent,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not enable.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await removePushSubscription(sub.endpoint);
      }
      setStatus("default");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return null;

  if (status === "unsupported") {
    return (
      <p className="text-xs text-zinc-500">
        Notifications need iOS 16.4+ and the app added to your home screen.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-xs text-zinc-500">
        Notifications are blocked. Enable them for ChiletsGetFit in your phone
        settings to get coach nudges.
      </p>
    );
  }

  if (status === "granted") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-xs">
        <span className="text-emerald-300">Notifications on</span>
        <button
          onClick={disable}
          disabled={busy}
          className="font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-red-400 disabled:opacity-60"
        >
          Turn off
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={enable}
      disabled={busy}
      className="w-full rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 px-4 py-3 text-left text-xs text-zinc-400 transition-colors hover:border-gold-400 hover:text-gold-400 disabled:opacity-60"
    >
      {busy ? (
        "Enabling..."
      ) : (
        <>
          <span className="font-semibold uppercase tracking-[0.2em] text-gold-400">
            Turn on notifications
          </span>{" "}
          — coach nudges + workout reminders.
        </>
      )}
      {error && (
        <span className="mt-2 block text-red-300">{error}</span>
      )}
    </button>
  );
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw =
    typeof atob === "function"
      ? atob(normalized)
      : Buffer.from(normalized, "base64").toString("binary");
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
