import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripeClient";
import { createAdminSupabase } from "@/lib/supabaseServerClient";

export async function POST(req: NextRequest) {
  const { devisId, sessionId } = await req.json();

  if (!devisId || !sessionId) {
    return NextResponse.json({ erreur: "devisId et sessionId requis" }, { status: 400 });
  }

  const supabase = createAdminSupabase();

  const { data: devis } = await supabase.from("devis").select("artisan_id, payee_le").eq("id", devisId).maybeSingle();

  if (!devis) {
    return NextResponse.json({ erreur: "Facture introuvable" }, { status: 404 });
  }

  if (devis.payee_le) {
    return NextResponse.json({ succes: true, payee_le: devis.payee_le, moyen_paiement: "Carte bancaire (en ligne)" });
  }

  const { data: artisan } = await supabase
    .from("artisans")
    .select("stripe_account_id")
    .eq("id", devis.artisan_id)
    .maybeSingle();

  if (!artisan?.stripe_account_id) {
    return NextResponse.json({ erreur: "Compte de paiement introuvable" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, { stripeAccount: artisan.stripe_account_id });

  if (session.metadata?.devis_id !== devisId || session.payment_status !== "paid") {
    return NextResponse.json({ erreur: "Paiement non confirmé" }, { status: 400 });
  }

  const payeeLe = new Date().toISOString();
  const moyenPaiement = "Carte bancaire (en ligne)";

  await supabase.from("devis").update({ payee_le: payeeLe, moyen_paiement: moyenPaiement }).eq("id", devisId);

  return NextResponse.json({ succes: true, payee_le: payeeLe, moyen_paiement: moyenPaiement });
}
