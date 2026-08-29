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

// Le navigateur previent ici quand il renouvelle/invalide l'abonnement push
// (expiration, rotation de cle...). On se re-abonne aussitot pour que le
// navigateur garde un abonnement valide ; le serveur, lui, est remis a jour
// a la prochaine ouverture de l'appli (resynchroniserPush dans pushClient.ts).
// Note : iOS ne declenche quasiment jamais cet evenement -- c'est surtout
// utile sur Android / navigateur de bureau.
self.addEventListener("pushsubscriptionchange", (event) => {
  const options = event.oldSubscription && event.oldSubscription.options;
  if (!options || !options.applicationServerKey) return;

  event.waitUntil(
    self.registration.pushManager.subscribe(options).catch(() => {
      // rien a faire : l'appli retentera au prochain demarrage
    })
  );
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
