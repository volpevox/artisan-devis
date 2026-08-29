import { NextRequest, NextResponse } from "next/server";
import { getArtisanConnecte } from "@/lib/supabaseServerClient";
import { envoyerNotificationPush } from "@/lib/pushNotifications";

// Bouton "Tester" dans Parametres : envoie une notification push de test a
// l'artisan connecte, pour qu'il verifie d'un geste que ca marche sans avoir
// a refaire un devis complet.
export async function POST(req: NextRequest) {
  const resultat = await getArtisanConnecte(req.headers.get("Authorization"));
  if ("erreur" in resultat) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: resultat.statut });
  }

  const envoi = await envoyerNotificationPush(resultat.artisan.id, {
    titre: "Notification test",
    corps: "Si tu vois ce message, tes notifications fonctionnent 🎉",
    url: "/parametres",
  });

  return NextResponse.json({
    envoyes: envoi.envoyes,
    aucun: envoi.total === 0,
  });
}
