import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabaseServerClient";
import { nomAffichageDocument } from "@/lib/nomAffichage";

// Sert le devis au client final (statut, signature...) : jamais de cache,
// sinon un client pourrait voir un statut perime apres avoir signe.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminSupabase();

  const { data: devis } = await supabase.from("devis").select("*").eq("id", params.id).maybeSingle();

  if (!devis) {
    return NextResponse.json({ erreur: "Devis introuvable" }, { status: 404 });
  }

  const { data: lignes } = await supabase
    .from("lignes_devis")
    .select("*")
    .eq("devis_id", params.id)
    .order("ordre", { ascending: true });

  const { data: artisan } = await supabase
    .from("artisans")
    .select("nom_complet, nom_entreprise, est_societe, telephone, taux_tva, stripe_paiement_actif, iban, bic, titulaire_compte, moyens_paiement, conditions_paiement")
    .eq("id", devis.artisan_id)
    .maybeSingle();

  // Seulement ce que la page affiche. L'IBAN et les conditions de paiement
  // ne servent qu'aux factures (ils figurent deja sur le PDF de la facture).
  const profil = artisan
    ? {
        nom_affiche: nomAffichageDocument(artisan),
        nom_complet: artisan.nom_complet,
        nom_entreprise: artisan.nom_entreprise,
        telephone: artisan.telephone,
        taux_tva: artisan.taux_tva,
        stripe_paiement_actif: artisan.stripe_paiement_actif,
        iban: devis.est_facture ? artisan.iban : null,
        bic: devis.est_facture ? artisan.bic : null,
        titulaire_compte: devis.est_facture ? artisan.titulaire_compte : null,
        moyens_paiement: artisan.moyens_paiement,
        conditions_paiement: devis.est_facture ? artisan.conditions_paiement : null,
      }
    : null;

  return NextResponse.json({ devis, lignes, profil }, { headers: { "Cache-Control": "no-store" } });
}
