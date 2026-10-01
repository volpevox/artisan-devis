import type { SupabaseClient } from "@supabase/supabase-js";
import { envoyerNotificationPush } from "@/lib/pushNotifications";
import { familleProvenance } from "@/lib/provenance";

// Notification push a Marley (ADMIN_EMAIL) a chaque nouvel inscrit, dans
// l'appli VolpeVox elle-meme (remplace ntfy.sh, pas fiable sur iPhone).
//
// "Une inscription = une notification", meme si l'appel d'inscription est
// coupe en route (fonction Vercel froide, delai de 4 s cote navigateur) :
// la colonne artisans.inscription_notifiee_le (supabase/notif-inscription.sql)
// est "reservee" en une seule operation avant l'envoi. Si l'appel est coupe
// avant, /api/activer-invite est rappelee a la prochaine ouverture de
// l'appli et rattrape la notification ; si elle est deja datee, rien ne part.
// Ne fait jamais echouer l'inscription.
export async function notifierNouvelInscrit(db: SupabaseClient, userId: string, emailInscrit: string) {
  try {
    const emailAdmin = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    if (!emailAdmin || emailInscrit.toLowerCase() === emailAdmin) return;

    // Reservation : seule la premiere requete trouve la colonne vide.
    const { data: reserve, error } = await db
      .from("artisans")
      .update({ inscription_notifiee_le: new Date().toISOString() })
      .eq("user_id", userId)
      .is("inscription_notifiee_le", null)
      .select("provenance_source, provenance_campagne, provenance_referent");
    if (error || !reserve || reserve.length === 0) return;

    // Retrouve le profil artisan de Marley pour viser ses appareils.
    let adminUserId: string | null = null;
    for (let page = 1; !adminUserId; page++) {
      const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      const u = data?.users.find((x) => (x.email || "").toLowerCase() === emailAdmin);
      if (u) adminUserId = u.id;
      if (!data || data.users.length < 1000) break;
    }
    if (!adminUserId) return;
    const { data: admin } = await db.from("artisans").select("id").eq("user_id", adminUserId).maybeSingle();
    if (!admin) return;

    const p = reserve[0];
    const source = familleProvenance(p.provenance_source, p.provenance_referent);
    const campagne = p.provenance_campagne ? ` (${p.provenance_campagne})` : "";
    await envoyerNotificationPush(admin.id, {
      titre: "🎉 Nouvel inscrit VolpeVox",
      corps: `${emailInscrit}\nVenu de : ${source}${campagne}`,
      url: "/admin",
    });
  } catch (err: any) {
    console.error("[notif inscription]", err?.message || err);
  }
}
