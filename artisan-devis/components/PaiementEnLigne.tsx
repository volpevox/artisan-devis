"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useArtisanSession } from "@/lib/useArtisan";

// Paiement par carte en ligne (Stripe Connect) dans Mon compte > Paiement,
// a cote des autres moyens de paiement. Le retour de l'inscription Stripe
// revient sur /profil?stripe_retour=1 (voir /api/connecter-paiements).
export function PaiementEnLigne({ nomAffiche }: { nomAffiche: string }) {
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

  async function connecter() {
    setEnCours(true);
    setMessage("");

    try {
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

  if (!charge) return null;

  const icone = (
    <span className="reglages-item-icone">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2.5 9.5h19" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </span>
  );

  return (
    <div className="champ">
      <p className="champ-label">Carte bancaire en ligne</p>
      <div className="reglages-liste">
        {actif ? (
          <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" className="reglages-item">
            {icone}
            <span className="reglages-item-corps">
              <span className="reglages-item-titre">Paiement en ligne</span>
              <span className="reglages-item-sous">Voir mon espace Stripe</span>
            </span>
            <span className="reglages-item-fin">
              <span className="pastille-etat ok">Activé</span>
            </span>
          </a>
        ) : (
          <button type="button" className="reglages-item" onClick={connecter} disabled={enCours}>
            {icone}
            <span className="reglages-item-corps">
              <span className="reglages-item-titre">Paiement en ligne</span>
              <span className="reglages-item-sous">
                {enCours
                  ? "Ouverture de Stripe..."
                  : stripeAccountId
                  ? "Reprendre l'inscription Stripe"
                  : "Tes clients paient la facture par carte"}
              </span>
            </span>
            <span className="reglages-item-fin">
              <span className="pastille-etat">À connecter</span>
            </span>
          </button>
        )}
      </div>
      <p className="champ-aide">Un lien « Payer par carte » apparaît sur tes factures et dans le mail envoyé au client.</p>
      {message && <p className="message">{message}</p>}
    </div>
  );
}
