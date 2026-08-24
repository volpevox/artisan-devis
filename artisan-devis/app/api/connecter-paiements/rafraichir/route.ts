import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripeClient";

export async function GET(req: NextRequest) {
  const stripeAccountId = req.nextUrl.searchParams.get("id");

  if (!stripeAccountId) {
    return NextResponse.redirect(`${req.nextUrl.origin}/profil`);
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

  return NextResponse.redirect(lien.url);
}
