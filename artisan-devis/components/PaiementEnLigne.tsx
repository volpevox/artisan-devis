"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useArtisanSession } from "@/lib/useArtisan";

// Paiement par carte en ligne (Stripe Connect) : 4e puce « Carte bancaire »
// a cote de Virement / Cheque / Especes dans Mon compte > Paiement. Elle ne
// se coche pas comme les autres : elle ouvre l'inscription Stripe, et
// apparait cochee une fois le compte Stripe valide. Le retour de
// l'inscription revient sur /profil?stripe_retour=1 (/api/connecter-paiements).
export function usePaiementEnLigne() {
  const { session, artisanId } = useArtisanSession();
  const [stripeAccountId, setStripeAccountId] = useState("");
  const [actif, setActif] = useState(false);
  const [charge, setCharge] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!artisanId) return;
    supabase
      .from("artisans")
      .select("stripe_account_id, stripe_paiement_actif")
      .eq("id", artisanId)
      .maybeSingle()
      .then(({ data }) => {
        setStripeAccountId(data?.stripe_account_id || "");
        setActif(!!data?.stripe_paiement_actif);
        setCharge(true);
      });
  }, [artisanId]);

  // Inscription Stripe commencee mais pas encore validee : on redemande le
  // statut a Stripe (il peut avoir change depuis, ex : retour d'inscription).
  useEffect(() => {
    if (!session || !stripeAccountId || actif) return;
    fetch("/api/statut-paiements", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.actif === "boolean") setActif(data.actif);
      })
      .catch(() => {});
  }, [session, stripeAccountId, actif]);

  // avantDepart : enregistre ce qui a ete saisi sur la page avant de partir
  // chez Stripe (sinon perdu au retour).
  async function connecter(nomAffiche: string, avantDepart?: () => Promise<void>) {
    setEnCours(true);
    setMessage("");

    try {
      if (avantDepart) await avantDepart();

      let accountToken: string | undefined;

      if (!stripeAccountId) {
        // Obligatoire pour les plateformes basees en France (conformite DSP2) :
        // Stripe exige un jeton de compte v2 cree cote navigateur (avec la cle
        // publique) avant toute creation de compte connecte avec configuration
        // marchand. Ce jeton ne contient que l'acceptation des conditions,
        // le reste des informations est collecte par Stripe lors de l'inscription.
        const resToken = await fetch("https://api.stripe.com/v2/core/account_tokens", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}`,
            "Content-Type": "application/json",
            "Stripe-Version": "2026-07-29.dahlia",
          },
          body: JSON.stringify({
            contact_email: session?.user?.email || undefined,
            display_name: nomAffiche || undefined,
          }),
        });
        const dataToken = await resToken.json();

        if (!resToken.ok) {
          setMessage("Erreur : " + (dataToken.error?.message || "création du jeton Stripe impossible"));
          setEnCours(false);
          return;
        }
        accountToken = dataToken.id;
      }

      const res = await fetch("/api/connecter-paiements", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ accountToken }),
      });
      const texte = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(texte);
      } catch {
        setMessage(`Erreur serveur (${res.status}) : ${texte.slice(0, 300)}`);
        setEnCours(false);
        return;
      }

      if (data.erreur) {
        setMessage("Erreur : " + data.erreur);
        setEnCours(false);
        return;
      }

      window.location.href = data.url;
    } catch (e: any) {
      setMessage("Erreur : " + e.message);
      setEnCours(false);
    }
  }

  return { charge, actif, commence: Boolean(stripeAccountId), enCours, message, connecter };
}
