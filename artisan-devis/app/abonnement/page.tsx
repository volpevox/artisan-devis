"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { useArtisanSession } from "@/lib/useArtisan";

const NUMERO_WHATSAPP_SUPPORT = "33766213674";

const FONCTIONNALITES = [
  "Devis et factures dictés à la voix",
  "Signature électronique des devis, directement sur le téléphone du client",
  "Relances automatiques (devis en attente, factures impayées)",
  "Paiement en ligne des factures, sans commission VolpeVox",
  "Carnet de prix qui apprend de tes devis précédents",
];

export default function Abonnement() {
  const { session, artisanId, loading: chargementSession } = useArtisanSession();
  const [essaiExpireLe, setEssaiExpireLe] = useState<string | null>(null);
  const [abonnementActif, setAbonnementActif] = useState(false);
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (chargementSession) return;

    // Avant tout premier abonnement, la ligne "artisans" n'existe pas encore
    // (voir useArtisanSession) : artisanId reste vide, ce qui est le signal
    // qu'il n'y a simplement rien a charger -- les valeurs par defaut
    // (aucun essai, aucun abonnement) sont deja correctes pour ce cas.
    if (!artisanId) {
      setChargement(false);
      return;
    }

    async function charger() {
      const { data } = await supabase
        .from("artisans")
        .select("essai_expire_le, abonnement_actif, stripe_subscription_id")
        .eq("id", artisanId)
        .maybeSingle();

      if (data) {
        setEssaiExpireLe(data.essai_expire_le);
        setAbonnementActif(data.abonnement_actif);
        setStripeSubscriptionId(data.stripe_subscription_id);
      }
      setChargement(false);
    }
    charger();
  }, [artisanId, chargementSession]);

  async function sAbonner() {
    setEnCours(true);
    setMessage("");

    const res = await fetch("/api/creer-abonnement", {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    const data = await res.json();

    if (data.erreur) {
      setMessage("Erreur : " + data.erreur);
      setEnCours(false);
      return;
    }

    window.location.href = data.url;
  }

  if (chargementSession || chargement) {
    return (
      <main className="page-shell">
        <Topbar />
        <p className="message">Chargement...</p>
      </main>
    );
  }

  const essaiTermine = essaiExpireLe ? new Date(essaiExpireLe) < new Date() : false;
  const joursRestants = essaiExpireLe
    ? Math.max(0, Math.ceil((new Date(essaiExpireLe).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const lienWhatsapp = `https://wa.me/${NUMERO_WHATSAPP_SUPPORT}?text=${encodeURIComponent(
    "Bonjour, j'ai besoin d'aide avec VolpeVox :"
  )}`;

  const offreDecouverte = !stripeSubscriptionId;

  // Ligne artisans presente (artisanId), sans abonnement Stripe et plus
  // active : c'etait un acces gratuit ("mois offert") qui a ete retire.
  const moisOffertTermine = Boolean(artisanId) && !abonnementActif && !stripeSubscriptionId;

  return (
    <main className="page-shell">
      <Topbar />

      <h1 className="page-title">Mon abonnement</h1>

      {moisOffertTermine && (
        <div className="abo-essai-termine">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 7v5.2l3.2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <p className="abo-essai-termine-titre">Ton mois offert est terminé</p>
            <p className="abo-essai-termine-texte">
              Abonne-toi pour continuer à créer tes devis et factures à la voix. Tes documents restent accessibles.
            </p>
          </div>
        </div>
      )}

      <div className="abo-carte">
        {offreDecouverte && <span className="abo-ruban">Découverte</span>}

        {abonnementActif ? (
          <span className="badge badge-success">Abonnement actif</span>
        ) : stripeSubscriptionId ? (
          <span className="badge badge-warning">Abonnement inactif</span>
        ) : (
          <span className="badge badge-neutral">Aucun abonnement en cours</span>
        )}

        {abonnementActif && essaiExpireLe && !essaiTermine ? (
          <p className="hint" style={{ margin: "8px 0 0" }}>
            Essai gratuit : {joursRestants} jour{joursRestants > 1 ? "s" : ""} restant{joursRestants > 1 ? "s" : ""}
          </p>
        ) : null}

        <div className="abo-prix">
          <span className="abo-prix-montant">{offreDecouverte ? "45 €" : "79 €"}</span>
          <span className="abo-prix-periode">/ mois{offreDecouverte ? " pendant 12 mois" : ""}</span>
        </div>
        {offreDecouverte && <p className="abo-prix-suite">Places limitées — puis 79 €/mois</p>}

        <ul className="abo-liste">
          {FONCTIONNALITES.map((f) => (
            <li key={f}>
              <span className="abo-liste-icone">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12.5 10 17 19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {f}
            </li>
          ))}
        </ul>

        {abonnementActif ? (
          <p className="abo-confirmation">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 12.5 11 15.5 16 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Merci de ta confiance !
          </p>
        ) : (
          <>
            <div className="abo-garantie">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span>
                {stripeSubscriptionId
                  ? "Sans engagement, résiliable à tout moment."
                  : "Essai gratuit de 14 jours, carte bancaire requise, aucun prélèvement avant la fin de l'essai. Sans engagement, résiliable à tout moment."}
              </span>
            </div>

            <button className="btn btn-primary abo-cta" onClick={sAbonner} disabled={enCours}>
              {enCours
                ? "Un instant..."
                : stripeSubscriptionId
                  ? "Réactiver mon abonnement"
                  : moisOffertTermine
                    ? "M'abonner"
                    : "Démarrer mon essai gratuit"}
            </button>
          </>
        )}

        {message && <p className="message">{message}</p>}
      </div>

      <div className="card">
        <span style={{ fontWeight: 600, color: "var(--text)" }}>Besoin d'aide ?</span>
        <p className="hint" style={{ margin: "6px 0 12px" }}>
          Une question sur l'outil, ton abonnement, un bug ? Écris-moi directement, je réponds rapidement.
        </p>
        <a className="btn-ghost" href={lienWhatsapp} target="_blank" rel="noreferrer">
          Contacter le support (WhatsApp)
        </a>
      </div>
    </main>
  );
}
