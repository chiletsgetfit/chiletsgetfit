"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Module-level guard so we never refresh more than once per local day, even when
// sessionStorage is unavailable. Without it a zone the server can't read would loop.
let refreshedFor: string | null = null;

/**
 * Tells the server which time zone the viewer is in (cookie `tz`) so "today"
 * in the food log is the viewer's day, not the server's. If the server guessed
 * wrong for this render, refresh once so the date corrects itself.
 */
export function TimezoneSync({ serverToday }: { serverToday: string }) {
  const router = useRouter();

  useEffect(() => {
    let tz: string | undefined;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!tz) return;

    const current = document.cookie
      .split("; ")
      .find((c) => c.startsWith("tz="))
      ?.slice(3);
    if (current !== encodeURIComponent(tz)) {
      document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
    }

    const localToday = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    if (localToday !== serverToday) {
      // Refresh at most once per local day so a zone the server can't read never loops.
      if (refreshedFor === localToday) return;
      refreshedFor = localToday;
      const key = `tz-refresh:${localToday}`;
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch {
        // storage blocked: the module-level guard above still limits us to one refresh
      }
      router.refresh();
    }
  }, [serverToday, router]);

  return null;
}
