import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripeClient";
import { getArtisanConnecte, createAdminSupabase } from "@/lib/supabaseServerClient";

export async function POST(req: NextRequest) {
  const resultat = await getArtisanConnecte(req.headers.get("Authorization"));
  if ("erreur" in resultat) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: resultat.statut });
  }
  const { artisan } = resultat;

  try {
    let stripeAccountId = artisan.stripe_account_id as string | null;

    if (!stripeAccountId) {
      const { accountToken } = await req.json().catch(() => ({ accountToken: undefined }));

      if (!accountToken) {
        return NextResponse.json({ erreur: "Jeton de compte Stripe manquant" }, { status: 400 });
      }

      // Le champ identity ne peut pas etre envoye dans le meme appel que
      // account_token (erreur Stripe "param_alongside_account_token") : on
      // cree d'abord le compte avec seulement le jeton, puis on fixe le pays
      // dans un appel a part, puis le reste (dashboard, configuration, devise).
      const compte = await stripe.v2.core.accounts.create({
        account_token: accountToken,
      });
      stripeAccountId = compte.id;

      await stripe.v2.core.accounts.update(stripeAccountId, {
        identity: {
          country: "fr",
        },
      });

      await stripe.v2.core.accounts.update(stripeAccountId, {
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
  } catch (e: any) {
    return NextResponse.json({ erreur: e.message || "Erreur inconnue" }, { status: 500 });
  }
}
