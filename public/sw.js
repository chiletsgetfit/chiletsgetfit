// Service worker — handles push notifications.
// Lives at /sw.js so it can control the whole site scope.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "ChiletsGetFit", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "ChiletsGetFit";
  const body = data.body || "";
  const url = data.url || "/app";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url },
      tag: data.tag || "chiletsgetfit",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/app";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = allClients.find((c) =>
        c.url.includes(self.location.origin)
      );
      if (existing) {
        await existing.focus();
        if ("navigate" in existing) {
          try {
            await existing.navigate(targetUrl);
          } catch {
            // ignore — focus alone is fine
          }
        }
        return;
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});
