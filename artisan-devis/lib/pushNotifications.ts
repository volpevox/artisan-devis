import webpush from "web-push";
import { createAdminSupabase } from "@/lib/supabaseServerClient";

webpush.setVapidDetails(
  "mailto:volpevox@outlook.fr",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface NotificationPush {
  titre: string;
  corps: string;
  url?: string;
}

// Envoie une notification push a tous les appareils enregistres d'un
// artisan. Ne fait jamais echouer l'appelant : une erreur individuelle
// (endpoint expire, cle manquante...) est avalee, et un abonnement qui
// repond 404/410 (peripherique/permission revoques) est supprime.
export async function envoyerNotificationPush(artisanId: string, notif: NotificationPush) {
  try {
    const supabaseAdmin = createAdminSupabase();
    const { data: abonnements } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("artisan_id", artisanId);

    if (!abonnements || abonnements.length === 0) {
      console.error(`[push] aucun abonnement enregistre pour l'artisan ${artisanId}`);
      return;
    }

    const payload = JSON.stringify({ title: notif.titre, body: notif.corps, url: notif.url || "/" });

    await Promise.all(
      abonnements.map(async (abo) => {
        try {
          await webpush.sendNotification(
            { endpoint: abo.endpoint, keys: { p256dh: abo.p256dh, auth: abo.auth } },
            payload
          );
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", abo.id);
          } else {
            console.error(`[push] echec d'envoi (abonnement ${abo.id}) :`, err?.statusCode, err?.body || err?.message || err);
          }
        }
      })
    );
  } catch (err: any) {
    // Une notification push ratee ne doit jamais faire echouer l'action
    // principale (signature enregistree, paiement confirme...) -- mais on
    // garde une trace de l'erreur pour pouvoir la diagnostiquer.
    console.error("[push] erreur inattendue lors de l'envoi :", err?.message || err);
  }
}
