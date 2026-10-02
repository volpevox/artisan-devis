import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getArtisanConnecte } from "@/lib/supabaseServerClient";
import { creerAcompte, envoyerAcompte } from "@/lib/acompteServeur";

// « Demander un acompte » sur un devis signe (lib/acompteServeur.tsx).
// Corps : { montant: TTC, pourcentage?: number | null } pour la creer,
// ou { renvoyer: true } pour renvoyer l'email d'un acompte deja cree.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const resultat = await getArtisanConnecte(req.headers.get("authorization"));
  if ("erreur" in resultat) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: resultat.statut });
  }
  const { artisan, email: emailArtisan } = resultat;
  const body = await req.json().catch(() => ({}));

  const supabase = createAdminSupabase();
  const { data: devis } = await supabase.from("devis").select("*").eq("id", params.id).maybeSingle();

  if (!devis) {
    return NextResponse.json({ erreur: "Devis introuvable" }, { status: 404 });
  }
  if (devis.artisan_id !== artisan.id) {
    return NextResponse.json({ erreur: "Ce devis ne t'appartient pas" }, { status: 403 });
  }

  const { data: profil } = await supabase.from("artisans").select("*").eq("id", devis.artisan_id).maybeSingle();

  if (body.renvoyer) {
    if (!devis.acompte_numero) {
      return NextResponse.json({ erreur: "Aucun acompte sur ce devis" }, { status: 400 });
    }
    if (!devis.client_email) {
      return NextResponse.json({ erreur: "Aucun email de client enregistré sur ce devis" }, { status: 400 });
    }
  } else {
    const creation = await creerAcompte(
      supabase,
      devis,
      Number(profil?.taux_tva ?? 20),
      Number(body.montant) || 0,
      Number(body.pourcentage) || null
    );
    if ("erreur" in creation) {
      return NextResponse.json({ erreur: creation.erreur }, { status: creation.statut });
    }
  }

  const envoi = await envoyerAcompte({ devis, profil, emailArtisan, origin: req.nextUrl.origin });
  return NextResponse.json({ succes: true, numero: devis.acompte_numero, ...envoi });
}
