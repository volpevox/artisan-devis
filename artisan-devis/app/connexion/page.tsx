"use client";
import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { IconeOeil } from "@/components/IconeOeil";
import { MODE_GRATUIT } from "@/lib/modeGratuit";
import { trackEvent } from "@/lib/analytics";

function ConnexionContenu() {
  // Le bouton "Demarrer mon essai gratuit" de la landing page pointe vers
  // /connexion?mode=inscription : on ouvre directement le formulaire de
  // creation de compte pour eviter un clic inutile a quelqu'un qui vient
  // deja de decider de s'inscrire.
  // (L'ecran d'accueil anime avec le logo est desormais affiche en amont,
  // au tout premier chargement de l'app -- voir app/page.tsx -- il n'a plus
  // besoin d'etre repete ici.)
  const searchParams = useSearchParams();
  const modeInscriptionDirect = searchParams.get("mode") === "inscription";

  const [mode, setMode] = useState<"connexion" | "inscription" | "oubli">(
    modeInscriptionDirect ? "inscription" : "connexion"
  );
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState("");
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);
  const [afficherConfirmation, setAfficherConfirmation] = useState(false);
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);
  const [conditionsAcceptees, setConditionsAcceptees] = useState(false);

  async function connexionGoogle() {
    setMessage("");
    setChargement(true);
    // Le navigateur part sur Google puis revient sur /auth/callback, qui
    // finalise (conversion GA4, acces gratuit) et redirige. En cas d'erreur
    // ici, on est encore sur cette page : on réaffiche le formulaire.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setMessage("Erreur : " + error.message);
      setChargement(false);
    }
  }

  async function valider(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (mode === "inscription" && motDePasse !== confirmationMotDePasse) {
      setMessage("Les deux mots de passe ne sont pas identiques.");
      return;
    }

    if (mode === "inscription" && !conditionsAcceptees) {
      setMessage("Merci d'accepter les conditions d'utilisation et la politique de confidentialité pour continuer.");
      return;
    }

    setChargement(true);

    if (mode === "oubli") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
      });

      setChargement(false);

      if (error) {
        setMessage("Erreur : " + error.message);
        return;
      }

      setMessage("Email envoyé ! Vérifie ta boîte mail (et tes spams) pour choisir un nouveau mot de passe.");
      return;
    }

    if (mode === "inscription") {
      const { data, error } = await supabase.auth.signUp({ email, password: motDePasse });

      if (error) {
        setMessage("Erreur : " + error.message);
        setChargement(false);
        return;
      }

      if (data.session) {
        // Conversion GA4 : un compte a bien ete cree (session ouverte
        // immediatement). Sert de base a la conversion Google Ads.
        // Sans effet hors production (voir lib/analytics.ts).
        trackEvent("sign_up", { method: "email" });

        // Acces gratuit (sans Stripe) pour les emails explicitement autorises
        // par Marley : /api/activer-invite verifie cote serveur l'email de la
        // session qui vient d'etre creee contre la liste EMAILS_ACCES_GRATUIT.
        // On ne passe plus par un code dans l'URL (?invite=) : un tel code se
        // perdait quand l'app etait relancee depuis l'ecran d'accueil sur
        // iOS (stockage isole entre Safari et l'app installee, y compris
        // pour une valeur memorisee en localStorage avant l'installation).
        // L'email, lui, est toujours disponible, peu importe le chemin pris.
        // Delai maximum de 4 s sur cet appel : sur Vercel, une fonction
        // serverless "froide" peut mettre plusieurs secondes a repondre, et
        // pendant ce temps le bouton reste beige sans que rien ne se passe.
        // Si le delai est depasse, on redirige vers /abonnement (parcours
        // payant normal) -- aucun risque pour un acces gratuit : useArtisan.ts
        // rappelle /api/activer-invite au prochain chargement et activera
        // l'acces (au pire, le popup de bienvenue "mois offert" ne s'affiche
        // pas cette fois-la).
        // En mode "gratuit pendant le lancement", tout le monde a l'accès :
        // on part du principe qu'il est accordé même si l'appel ci-dessous
        // dépasse le délai (fonction Vercel froide). useArtisan.ts le
        // confirmera de toute façon au prochain chargement.
        let accesGratuit = MODE_GRATUIT;
        try {
          const controleur = new AbortController();
          const minuteur = setTimeout(() => controleur.abort(), 4000);
          const reponse = await fetch("/api/activer-invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${data.session.access_token}` },
            signal: controleur.signal,
          });
          clearTimeout(minuteur);
          const resultat = await reponse.json();
          accesGratuit = Boolean(resultat.ok);
        } catch {
          // Ignore (delai depasse, reseau, etc.) : useArtisan.ts renverra
          // vers /abonnement ou activera l'acces gratuit au prochain chargement.
        }

        // Une vraie navigation (plutot qu'un changement de page en JS) est
        // necessaire pour que Safari/Chrome proposent d'enregistrer le mot
        // de passe : leur heuristique de detection de connexion reussie ne
        // se declenche pas de facon fiable avec un simple router.push.
        // Direction /abonnement (et non /profil) : la carte bancaire est
        // desormais obligatoire des l'inscription, useArtisan.ts y renverrait
        // de toute facon tant qu'aucun abonnement Stripe n'existe -- sauf pour
        // un email a acces gratuit, deja gere ci-dessus. Le "?bienvenue=..."
        // vers /profil directement (et pas juste "/") reproduit ce que fait le
        // retour de paiement Stripe reussi (/api/creer-abonnement) : sans lui,
        // le popup de bienvenue (PropositionCommentCaMarche, qui ne lit ce
        // parametre que sur /profil) ne s'affiche jamais pour l'acces gratuit,
        // et passer par "/" d'abord le ferait perdre au prochain redirect de
        // useArtisan.ts vers /profil. Valeur "gratuit" (et non "1") pour que
        // le popup affiche la variante "premier mois offert".
        window.location.href = accesGratuit ? "/profil?bienvenue=gratuit" : "/abonnement";
      } else {
        setMessage("Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.");
        setChargement(false);
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });

    if (error) {
      setMessage("Erreur : " + error.message);
      setChargement(false);
      return;
    }

    // Idem : vraie navigation pour laisser le navigateur proposer
    // l'enregistrement du mot de passe.
    window.location.href = "/";
  }

  return (
    <main className="page-shell connexion-shell">
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <Image src="/fox-icon.png" alt="" aria-hidden="true" width={84} height={84} className="connexion-logo" priority />
        <p className="connexion-brand">
          <span className="brand-volpe">Volpe</span>
          <span className="brand-vox">Vox</span>
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 16, color: "var(--ink)" }}>
          {mode === "connexion" ? "Se connecter" : mode === "inscription" ? "Créer un compte" : "Mot de passe oublié"}
        </h2>

        {mode !== "oubli" && (
          <>
            <button
              type="button"
              onClick={connexionGoogle}
              disabled={chargement}
              className="btn"
              style={{
                width: "100%",
                background: "#fff",
                color: "#1f1f1f",
                border: "1px solid #dadce0",
                gap: 10,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
                <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33Z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
              </svg>
              {mode === "connexion" ? "Se connecter avec Google" : "Continuer avec Google"}
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                margin: "16px 0",
                color: "var(--muted)",
                fontSize: 12.5,
              }}
            >
              <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
              ou
              <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
          </>
        )}

        <form onSubmit={valider} autoComplete="on">
          <input
            className="field"
            type="email"
            name="email"
            autoComplete="username"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode !== "oubli" && (
            <div className="champ-mot-de-passe">
              <input
                className="field"
                type={afficherMotDePasse ? "text" : "password"}
                name="password"
                autoComplete={mode === "inscription" ? "new-password" : "current-password"}
                placeholder="Mot de passe"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                style={{ marginBottom: 0 }}
              />
              <button
                type="button"
                className="champ-oeil"
                onClick={() => setAfficherMotDePasse((v) => !v)}
                aria-label={afficherMotDePasse ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                <IconeOeil ouvert={afficherMotDePasse} />
              </button>
            </div>
          )}

          {mode === "inscription" && (
            <div className="champ-mot-de-passe">
              <input
                className="field"
                type={afficherConfirmation ? "text" : "password"}
                name="confirmation-password"
                autoComplete="new-password"
                placeholder="Confirmer le mot de passe"
                value={confirmationMotDePasse}
                onChange={(e) => setConfirmationMotDePasse(e.target.value)}
                style={{ marginBottom: 0 }}
              />
              <button
                type="button"
                className="champ-oeil"
                onClick={() => setAfficherConfirmation((v) => !v)}
                aria-label={afficherConfirmation ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                <IconeOeil ouvert={afficherConfirmation} />
              </button>
            </div>
          )}

          {mode === "inscription" && (
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "var(--muted)", margin: "4px 0 14px" }}>
              <input
                type="checkbox"
                checked={conditionsAcceptees}
                onChange={(e) => setConditionsAcceptees(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>
                J'accepte les{" "}
                <a href="/cgu" target="_blank" rel="noreferrer" style={{ color: "var(--ink)" }}>
                  conditions d'utilisation
                </a>
                , les{" "}
                <a href="/cgv" target="_blank" rel="noreferrer" style={{ color: "var(--ink)" }}>
                  conditions de vente
                </a>{" "}
                et la{" "}
                <a href="/confidentialite" target="_blank" rel="noreferrer" style={{ color: "var(--ink)" }}>
                  politique de confidentialité
                </a>
                .
              </span>
            </label>
          )}

          <button type="submit" className="btn btn-primary" disabled={chargement} style={{ width: "100%" }}>
            {mode === "connexion" ? "Se connecter" : mode === "inscription" ? "Créer mon compte" : "Envoyer le lien"}
          </button>

          {mode === "connexion" && (
            <p style={{ marginTop: 12, fontSize: 13, textAlign: "center" }}>
              <button
                type="button"
                onClick={() => {
                  setMode("oubli");
                  setMessage("");
                }}
                style={{ background: "none", border: "none", color: "var(--muted)", fontWeight: 600, cursor: "pointer", padding: 0, textDecoration: "underline" }}
              >
                Mot de passe oublié ?
              </button>
            </p>
          )}
        </form>

        {message && <p className="message">{message}</p>}

        <p style={{ marginTop: 16, fontSize: 13.5, textAlign: "center" }}>
          {mode === "connexion" ? (
            <>
              Pas encore de compte ?{" "}
              <button
                type="button"
                onClick={() => setMode("inscription")}
                style={{ background: "none", border: "none", color: "var(--ink)", fontWeight: 600, cursor: "pointer", padding: 0 }}
              >
                Créer un compte
              </button>
            </>
          ) : (
            <>
              Déjà un compte ?{" "}
              <button
                type="button"
                onClick={() => setMode("connexion")}
                style={{ background: "none", border: "none", color: "var(--ink)", fontWeight: 600, cursor: "pointer", padding: 0 }}
              >
                Se connecter
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}

export default function Connexion() {
  return (
    <Suspense fallback={null}>
      <ConnexionContenu />
    </Suspense>
  );
}
