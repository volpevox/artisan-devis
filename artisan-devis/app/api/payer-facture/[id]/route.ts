import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripeClient";
import { createAdminSupabase } from "@/lib/supabaseServerClient";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminSupabase();

  const { data: devis } = await supabase.from("devis").select("*").eq("id", params.id).maybeSingle();

  if (!devis || !devis.est_facture) {
    return NextResponse.json({ erreur: "Facture introuvable" }, { status: 404 });
  }

  if (devis.payee_le) {
    return NextResponse.json({ erreur: "Cette facture est déjà payée" }, { status: 400 });
  }

  const { data: artisan } = await supabase
    .from("artisans")
    .select("stripe_account_id, stripe_paiement_actif, nom_entreprise, taux_tva")
    .eq("id", devis.artisan_id)
    .maybeSingle();

  if (!artisan?.stripe_paiement_actif || !artisan.stripe_account_id) {
    return NextResponse.json({ erreur: "Le paiement en ligne n'est pas disponible pour cette facture" }, { status: 400 });
  }

  const tauxTva = artisan.taux_tva ?? 20;
  const totalTTC = (devis.total ?? 0) * (1 + tauxTva / 100);
  const montantCentimes = Math.round(totalTTC * 100);

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: montantCentimes,
            product_data: {
              name: `Facture${devis.numero_facture ? ` n°${devis.numero_facture}` : ""} — ${artisan.nom_entreprise || ""}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${req.nextUrl.origin}/signer/${params.id}?paiement=succes&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.nextUrl.origin}/signer/${params.id}`,
      metadata: { devis_id: params.id },
    },
    { stripeAccount: artisan.stripe_account_id }
  );

  return NextResponse.json({ url: session.url });
}
