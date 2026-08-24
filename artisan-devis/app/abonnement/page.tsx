"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { useArtisanSession } from "@/lib/useArtisan";

export default function Abonnement() {
  const { session, artisanId, loading: chargementSession } = useArtisanSession();
  const [essaiExpireLe, setEssaiExpireLe] = useState<string | null>(null);
  const [abonnementActif, setAbonnementActif] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!artisanId) return;

    async function charger() {
      const { data } = await supabase
        .from("artisans")
        .select("essai_expire_le, abonnement_actif")
        .eq("id", artisanId)
        .maybeSingle();

      if (data) {
        setEssaiExpireLe(data.essai_expire_le);
        setAbonnementActif(data.abonnement_actif);
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

  async function gererAbonnement() {
    setEnCours(true);
    setMessage("");

    const res = await fetch("/api/portail-abonnement", {
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

  return (
    <main className="page-shell">
      <Topbar />

      <h1 className="page-title">Mon abonnement</h1>

      <div className="card">
        {abonnementActif ? (
          <>
            <p>Ton abonnement VolpeVox est actif. Merci !</p>
            <button className="btn btn-primary" onClick={gererAbonnement} disabled={enCours}>
              Gérer mon abonnement
            </button>
          </>
        ) : (
          <>
            {essaiTermine ? (
              <p className="hint">Ton essai gratuit de 14 jours est terminé.</p>
            ) : (
              <p className="hint">
                Il te reste {joursRestants} jour{joursRestants > 1 ? "s" : ""} d&apos;essai gratuit.
              </p>
            )}

            <p style={{ fontSize: 22, fontWeight: 700, margin: "12px 0" }}>79€ / mois</p>
            <p className="hint" style={{ marginBottom: 16 }}>
              Devis et factures dictés à la voix, signature électronique, relances automatiques.
            </p>

            <button className="btn btn-primary" onClick={sAbonner} disabled={enCours}>
              S&apos;abonner maintenant
            </button>
          </>
        )}

        {message && <p className="message">{message}</p>}
      </div>
    </main>
  );
}
