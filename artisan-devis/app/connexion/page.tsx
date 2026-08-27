"use client";
import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { SplashEcran } from "@/components/SplashEcran";
import { IconeOeil } from "@/components/IconeOeil";

function ConnexionContenu() {
  // Le bouton "Demarrer mon essai gratuit" de la landing page pointe vers
  // /connexion?mode=inscription : on saute directement au formulaire de
  // creation de compte (et on passe l'ecran de demarrage) pour eviter deux
  // clics inutiles a quelqu'un qui vient deja de decider de s'inscrire.
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
  const [afficherDemarrage, setAfficherDemarrage] = useState(!modeInscriptionDirect);
  const [conditionsAcceptees, setConditionsAcceptees] = useState(false);

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
        let accesGratuit = false;
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

  if (afficherDemarrage) {
    return <SplashEcran onContinuer={() => setAfficherDemarrage(false)} />;
  }

  return (
    <main className="page-shell" style={{ justifyContent: "center" }}>
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
