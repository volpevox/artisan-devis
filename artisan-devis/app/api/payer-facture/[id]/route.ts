import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripeClient";
import { createAdminSupabase } from "@/lib/supabaseServerClient";
import { resteAPayer } from "@/lib/acompte";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminSupabase();

  const { data: devis } = await supabase.from("devis").select("*").eq("id", params.id).maybeSingle();
  // ?acompte=1 : payer la facture d'acompte du devis (supabase/acompte.sql).
  const acompte = req.nextUrl.searchParams.get("acompte") === "1";

  if (acompte) {
    if (!devis?.acompte_numero) {
      return NextResponse.json({ erreur: "Facture d'acompte introuvable" }, { status: 404 });
    }
    if (devis.acompte_payee_le) {
      return NextResponse.json({ erreur: "Cet acompte est déjà payé" }, { status: 400 });
    }
  } else {
    if (!devis || !devis.est_facture) {
      return NextResponse.json({ erreur: "Facture introuvable" }, { status: 404 });
    }

    if (devis.avoir_numero) {
      return NextResponse.json({ erreur: "Cette facture a été annulée" }, { status: 400 });
    }

    if (devis.payee_le) {
      return NextResponse.json({ erreur: "Cette facture est déjà payée" }, { status: 400 });
    }
  }

  const { data: artisan } = await supabase
    .from("artisans")
    .select("stripe_account_id, stripe_paiement_actif, nom_entreprise, taux_tva, logo_url")
    .eq("id", devis.artisan_id)
    .maybeSingle();

  if (!artisan?.stripe_paiement_actif || !artisan.stripe_account_id) {
    return NextResponse.json({ erreur: "Le paiement en ligne n'est pas disponible pour cette facture" }, { status: 400 });
  }

  const tauxTva = artisan.taux_tva ?? 20;
  // Facture finale : seulement le reste, l'acompte deja facture est deduit.
  const montant = acompte ? Number(devis.acompte_montant) || 0 : resteAPayer(devis, tauxTva);
  const montantCentimes = Math.round(montant * 100);
  const libelle = acompte
    ? `Facture d'acompte n°${devis.acompte_numero}`
    : `Facture${devis.numero_facture ? ` n°${devis.numero_facture}` : ""}`;

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "eur",
              unit_amount: montantCentimes,
              product_data: {
                name: `${libelle} — ${artisan.nom_entreprise || ""}`,
                images: artisan.logo_url ? [artisan.logo_url] : undefined,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${req.nextUrl.origin}/signer/${params.id}?paiement=succes&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.nextUrl.origin}/signer/${params.id}`,
        // acompte : lu par /api/confirmer-paiement-facture et le webhook pour
        // savoir quelle facture marquer payee.
        metadata: acompte ? { devis_id: params.id, acompte: "1" } : { devis_id: params.id },
      },
      { stripeAccount: artisan.stripe_account_id }
    );

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error(`[payer-facture ${params.id}] creation de la session Stripe echouee :`, e?.message || e);
    return NextResponse.json({ erreur: e?.message || "Erreur inconnue lors de la creation du paiement" }, { status: 500 });
  }
}
