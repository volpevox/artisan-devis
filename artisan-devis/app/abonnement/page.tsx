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
    if (!artisanId) return;

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
  }, [artisanId]);

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

  return (
    <main className="page-shell">
      <Topbar />

      <h1 className="page-title">Mon abonnement</h1>

      <div className="card">
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

        {!stripeSubscriptionId ? (
          <p className="doc-card-total" style={{ marginTop: 14, fontSize: 20 }}>
            45 € <span style={{ fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>/ mois pendant 12 mois</span>
            <br />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
              Offre découverte, places limitées — puis 79 €/mois
            </span>
          </p>
        ) : (
          <p className="doc-card-total" style={{ marginTop: 14 }}>
            79 € <span style={{ fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>/ mois</span>
          </p>
        )}

        <p className="hint" style={{ margin: "2px 0 12px" }}>
          {!stripeSubscriptionId
            ? "Essai gratuit de 21 jours, carte bancaire requise, aucun prélèvement avant la fin de l'essai. Sans engagement, résiliable à tout moment."
            : "Sans engagement, résiliable à tout moment."}
        </p>

        <ul style={{ margin: "0 0 18px", paddingLeft: 18, color: "var(--text)", fontSize: 13.5, lineHeight: 1.75 }}>
          {FONCTIONNALITES.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>

        {abonnementActif ? (
          <p style={{ margin: 0, color: "var(--success)", fontWeight: 600 }}>✓ Merci de ta confiance !</p>
        ) : (
          <button className="btn-solid" onClick={sAbonner} disabled={enCours}>
            {stripeSubscriptionId ? "Réactiver mon abonnement" : "Démarrer mon essai gratuit"}
          </button>
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
