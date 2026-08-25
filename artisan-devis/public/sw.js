// Service worker minimal, dedie aux notifications push (aucun cache, aucune
// interception de fetch) -- pour ne pas interferer avec le comportement PWA
// deja en place, volontairement simple sur iOS.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let donnees = {};
  try {
    donnees = event.data ? event.data.json() : {};
  } catch {
    donnees = {};
  }

  const titre = donnees.title || "VolpeVox";
  const options = {
    body: donnees.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: donnees.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(titre, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
