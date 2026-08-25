"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { useArtisanSession } from "@/lib/useArtisan";
import { notificationsPossibles, abonnementActuel, activerNotifications, desactiverNotifications } from "@/lib/pushClient";

const NUMERO_WHATSAPP_SUPPORT = "33766213674";

export default function Parametres() {
  const { session, artisanId, loading: chargementSession } = useArtisanSession();
  const [nomComplet, setNomComplet] = useState("");
  const [nomEntreprise, setNomEntreprise] = useState("");
  const [stripeAccountId, setStripeAccountId] = useState("");
  const [stripePaiementActif, setStripePaiementActif] = useState(false);
  const [enCoursStripe, setEnCoursStripe] = useState(false);
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(true);

  const [etatNotifications, setEtatNotifications] = useState<"verification" | "indisponible" | "inactif" | "actif">(
    "verification"
  );
  const [notifEnCours, setNotifEnCours] = useState(false);
  const [notifMessage, setNotifMessage] = useState("");

  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState("");
  const [motDePasseMessage, setMotDePasseMessage] = useState("");
  const [motDePasseEnCours, setMotDePasseEnCours] = useState(false);

  useEffect(() => {
    if (!artisanId) return;

    async function charger() {
      const { data } = await supabase
        .from("artisans")
        .select("nom_complet, nom_entreprise, stripe_account_id, stripe_paiement_actif")
        .eq("id", artisanId)
        .maybeSingle();
      if (data) {
        setNomComplet(data.nom_complet || "");
        setNomEntreprise(data.nom_entreprise || "");
        setStripeAccountId(data.stripe_account_id || "");
        setStripePaiementActif(!!data.stripe_paiement_actif);
      }
      setChargement(false);
    }
    charger();
  }, [artisanId]);

  useEffect(() => {
    if (!notificationsPossibles()) {
      setEtatNotifications("indisponible");
      return;
    }
    abonnementActuel().then((sub) => setEtatNotifications(sub ? "actif" : "inactif"));
  }, []);

  async function basculerNotifications() {
    if (!session) return;
    setNotifEnCours(true);
    setNotifMessage("");

    try {
      if (etatNotifications === "actif") {
        await desactiverNotifications(session.access_token);
        setEtatNotifications("inactif");
      } else {
        await activerNotifications(session.access_token);
        setEtatNotifications("actif");
      }
    } catch (e: any) {
      setNotifMessage(e.message || "Erreur");
    }

    setNotifEnCours(false);
  }

  async function changerMotDePasse() {
    setMotDePasseMessage("");

    if (nouveauMotDePasse.length < 6) {
      setMotDePasseMessage("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (nouveauMotDePasse !== confirmationMotDePasse) {
      setMotDePasseMessage("Les deux mots de passe ne sont pas identiques.");
      return;
    }

    setMotDePasseEnCours(true);
    const { error } = await supabase.auth.updateUser({ password: nouveauMotDePasse });
    setMotDePasseEnCours(false);

    if (error) {
      setMotDePasseMessage("Erreur : " + error.message);
      return;
    }

    setNouveauMotDePasse("");
    setConfirmationMotDePasse("");
    setMotDePasseMessage("Mot de passe mis à jour !");
  }

  useEffect(() => {
    if (!session || !stripeAccountId || stripePaiementActif) return;

    async function verifierStatut() {
      const res = await fetch("/api/statut-paiements", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (typeof data.actif === "boolean") setStripePaiementActif(data.actif);
    }
    verifierStatut();
  }, [session, stripeAccountId, stripePaiementActif]);

  async function connecterPaiements() {
    setEnCoursStripe(true);
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
            display_name: nomEntreprise || nomComplet || undefined,
          }),
        });
        const dataToken = await resToken.json();

        if (!resToken.ok) {
          setMessage("Erreur : " + (dataToken.error?.message || "création du jeton Stripe impossible"));
          setEnCoursStripe(false);
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
        setEnCoursStripe(false);
        return;
      }

      if (data.erreur) {
        setMessage("Erreur : " + data.erreur);
        setEnCoursStripe(false);
        return;
      }

      window.location.href = data.url;
    } catch (e: any) {
      setMessage("Erreur : " + e.message);
      setEnCoursStripe(false);
    }
  }

  if (chargementSession || chargement) {
    return (
      <main className="page-shell">
        <Topbar />
        <p className="message">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <Topbar />

      <h1 className="page-title">Paramètres</h1>

      <div className="tuiles-carrees">
        <Link href="/abonnement" className="tuile-carree">
          <span className="tuile-carree-titre">Mon abonnement</span>
          <svg className="tuile-carree-icone" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3 9.5h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span className="hint" style={{ margin: 0 }}>Gérer mon abonnement VolpeVox</span>
        </Link>

        {stripePaiementActif ? (
          <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" className="tuile-carree">
            <span className="tuile-carree-titre">Paiement en ligne</span>
            <svg className="tuile-carree-icone" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M2.5 9.5h19" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <span style={{ color: "var(--success)", fontWeight: 600, fontSize: 13 }}>✓ Activé — voir mon espace Stripe</span>
          </a>
        ) : (
          <button type="button" className="tuile-carree" onClick={connecterPaiements} disabled={enCoursStripe}>
            <span className="tuile-carree-titre">Paiement en ligne</span>
            <svg className="tuile-carree-icone" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M2.5 9.5h19" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <span className="hint" style={{ margin: 0 }}>
              {stripeAccountId ? "Reprendre l'inscription Stripe" : "Connecter Stripe (sans commission)"}
            </span>
          </button>
        )}
      </div>

      {message && <p className="message">{message}</p>}

      {etatNotifications !== "indisponible" && (
        <div className="card">
          <h2 style={{ fontSize: 15, marginTop: 0, marginBottom: 8, color: "var(--ink)" }}>Notifications</h2>
          <p className="hint" style={{ margin: "0 0 12px" }}>
            Reçois une alerte sur ton téléphone dès qu'un devis est signé ou qu'une facture est payée. Fonctionne si
            VolpeVox est ajouté à l'écran d'accueil.
          </p>
          {etatNotifications !== "verification" && (
            <button className="btn btn-primary" onClick={basculerNotifications} disabled={notifEnCours}>
              {etatNotifications === "actif" ? "Désactiver les notifications" : "Activer les notifications"}
            </button>
          )}
          {notifMessage && <p className="message">{notifMessage}</p>}
        </div>
      )}

      <div className="card">
        <h2 style={{ fontSize: 15, marginTop: 0, marginBottom: 8, color: "var(--ink)" }}>Mot de passe</h2>
        <p className="hint" style={{ margin: "0 0 12px" }}>
          Change le mot de passe de ton compte VolpeVox.
        </p>
        <input
          className="field"
          type="password"
          autoComplete="new-password"
          placeholder="Nouveau mot de passe"
          value={nouveauMotDePasse}
          onChange={(e) => setNouveauMotDePasse(e.target.value)}
        />
        <input
          className="field"
          type="password"
          autoComplete="new-password"
          placeholder="Confirme le mot de passe"
          value={confirmationMotDePasse}
          onChange={(e) => setConfirmationMotDePasse(e.target.value)}
        />
        <button className="btn btn-primary" onClick={changerMotDePasse} disabled={motDePasseEnCours}>
          Mettre à jour le mot de passe
        </button>
        {motDePasseMessage && <p className="message">{motDePasseMessage}</p>}
      </div>

      <div className="card">
        <h2 style={{ fontSize: 15, marginTop: 0, marginBottom: 10, color: "var(--ink)" }}>Informations légales</h2>
        <div className="liens-legaux" style={{ marginTop: 0 }}>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/cgu">Conditions générales d'utilisation</Link>
          <Link href="/cgv">Conditions générales de vente</Link>
          <Link href="/confidentialite">Confidentialité &amp; cookies</Link>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 15, marginTop: 0, marginBottom: 8, color: "var(--ink)" }}>Mes données</h2>
        <p className="hint" style={{ margin: "0 0 12px" }}>
          Conformément à ta politique de confidentialité, tu peux demander l'export ou la suppression de tes données à
          tout moment. Écris-moi directement, je m'en occupe.
        </p>
        <div className="liens-legaux" style={{ marginTop: 0 }}>
          <a
            href={`https://wa.me/${NUMERO_WHATSAPP_SUPPORT}?text=${encodeURIComponent(
              "Bonjour, je souhaite demander l'export de mes données VolpeVox."
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            Demander l'export de mes données
          </a>
          <a
            href={`https://wa.me/${NUMERO_WHATSAPP_SUPPORT}?text=${encodeURIComponent(
              "Bonjour, je souhaite demander la suppression de mon compte VolpeVox et de mes données."
            )}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--danger)" }}
          >
            Supprimer mon compte
          </a>
        </div>
      </div>
    </main>
  );
}
