import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripeClient";
import { getArtisanConnecte, createAdminSupabase } from "@/lib/supabaseServerClient";

export async function POST(req: NextRequest) {
  const resultat = await getArtisanConnecte(req.headers.get("Authorization"));
  if ("erreur" in resultat) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: resultat.statut });
  }
  const { supabase, artisan } = resultat;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let stripeAccountId = artisan.stripe_account_id as string | null;

  if (!stripeAccountId) {
    const compte = await stripe.v2.core.accounts.create({
      contact_email: user?.email || undefined,
      display_name: artisan.nom_entreprise || undefined,
      dashboard: "full",
      configuration: {
        merchant: {
          capabilities: {
            card_payments: { requested: true },
          },
        },
      },
      defaults: {
        currency: "eur",
        responsibilities: {
          fees_collector: "stripe",
          losses_collector: "stripe",
        },
        locales: ["fr-FR"],
      },
    });
    stripeAccountId = compte.id;

    const supabaseAdmin = createAdminSupabase();
    await supabaseAdmin.from("artisans").update({ stripe_account_id: stripeAccountId }).eq("id", artisan.id);
  }

  const lien = await stripe.v2.core.accountLinks.create({
    account: stripeAccountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["merchant"],
        return_url: `${req.nextUrl.origin}/profil?stripe_retour=1`,
        refresh_url: `${req.nextUrl.origin}/api/connecter-paiements/rafraichir?id=${stripeAccountId}`,
      },
    },
  });

  return NextResponse.json({ url: lien.url });
}
