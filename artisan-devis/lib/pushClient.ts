"use client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)));
}

// Memoire locale (ce navigateur / cette install PWA) : l'artisan a-t-il deja
// active les notifications ici ? iOS invalide regulierement l'abonnement push
// d'une PWA sans prevenir -- ce drapeau permet de savoir qu'il faut essayer de
// le recreer au demarrage plutot que de rester silencieux.
const CLE_PUSH_ACTIVE = "volpevox_push_active";

export function pushMarquerActive(actif: boolean) {
  try {
    if (actif) localStorage.setItem(CLE_PUSH_ACTIVE, "1");
    else localStorage.removeItem(CLE_PUSH_ACTIVE);
  } catch {
    // navigation privee / stockage bloque : on continue sans memoire locale
  }
}

export function pushEtaitActive() {
  try {
    return localStorage.getItem(CLE_PUSH_ACTIVE) === "1";
  } catch {
    return false;
  }
}

export function notificationsPossibles() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export async function abonnementActuel(): Promise<PushSubscription | null> {
  if (!notificationsPossibles()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function activerNotifications(accessToken: string) {
  if (!notificationsPossibles()) {
    throw new Error("Notifications non disponibles sur ce navigateur.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permission refusée. Tu peux la réactiver dans les réglages de ton navigateur/téléphone.");
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  });

  const json = subscription.toJSON();
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });

  pushMarquerActive(true);
  return subscription;
}

export async function desactiverNotifications(accessToken: string) {
  pushMarquerActive(false);

  const subscription = await abonnementActuel();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ endpoint }),
  });
}

// Appele a chaque ouverture de l'appli quand l'artisan avait deja active les
// notifications sur cet appareil. Recree en silence l'abonnement push si iOS
// l'a invalide (subscription disparue alors que la permission est toujours
// accordee), puis remet l'endpoint a jour cote serveur.
//
//   "ok"                -> abonnement present ou recree, serveur a jour
//   "permission-perdue" -> iOS/Safari a retire l'autorisation : seule une
//                          action de l'artisan peut la redonner (bandeau)
//   "impossible"        -> navigateur sans push, ou echec technique ponctuel
export async function resynchroniserPush(
  accessToken: string
): Promise<"ok" | "permission-perdue" | "impossible"> {
  if (!notificationsPossibles()) return "impossible";
  if (!pushEtaitActive()) return "ok"; // jamais active ici : rien a reparer

  if (Notification.permission !== "granted") {
    return "permission-perdue";
  }

  try {
    const registration =
      (await navigator.serviceWorker.getRegistration()) ||
      (await navigator.serviceWorker.register("/sw.js"));
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      // C'est le cas iOS classique : la permission est la, mais l'abonnement
      // technique a ete jete. On en refait un neuf (nouvel endpoint).
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
    }

    const json = subscription.toJSON();
    const reponse = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });

    return reponse.ok ? "ok" : "impossible";
  } catch {
    return "impossible";
  }
}

// Demande au serveur d'envoyer une notification push de test a tous les
// appareils enregistres de l'artisan (bouton "Tester" dans Parametres).
export async function envoyerNotificationTest(
  accessToken: string
): Promise<{ envoyes: number; aucun: boolean }> {
  const reponse = await fetch("/api/push/test", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!reponse.ok) throw new Error("L'envoi de la notification test a échoué.");
  const data = await reponse.json();
  return { envoyes: data.envoyes || 0, aucun: !!data.aucun };
}
