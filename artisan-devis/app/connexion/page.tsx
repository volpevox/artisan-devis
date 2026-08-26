"use client";
import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { SplashEcran } from "@/components/SplashEcran";

function ConnexionContenu() {
  // Le bouton "Demarrer mon essai gratuit" de la landing page pointe vers
  // /connexion?mode=inscription : on saute directement au formulaire de
  // creation de compte (et on passe l'ecran de demarrage) pour eviter deux
  // clics inutiles a quelqu'un qui vient deja de decider de s'inscrire.
  const searchParams = useSearchParams();
  const modeInscriptionDirect = searchParams.get("mode") === "inscription";
  const codeInvitation = searchParams.get("invite");

  const [mode, setMode] = useState<"connexion" | "inscription" | "oubli">(
    modeInscriptionDirect ? "inscription" : "connexion"
  );
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState("");
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
        // Lien d'invitation (acces gratuit, sans Stripe) : le code est verifie
        // cote serveur dans /api/activer-invite avant d'activer l'acces. On
        // tente l'activation avant de rediriger, mais on redirige vers "/"
        // dans tous les cas -- si le code est absent/invalide, useArtisan.ts
        // renverra simplement vers /abonnement comme d'habitude.
        if (codeInvitation) {
          try {
            await fetch("/api/activer-invite", {
              method: "POST",
              headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ code: codeInvitation }),
            });
          } catch {
            // Ignore : useArtisan.ts renverra vers /abonnement si l'activation a echoue.
          }
        }

        // Une vraie navigation (plutot qu'un changement de page en JS) est
        // necessaire pour que Safari/Chrome proposent d'enregistrer le mot
        // de passe : leur heuristique de detection de connexion reussie ne
        // se declenche pas de facon fiable avec un simple router.push.
        // Direction /abonnement (et non /profil) : la carte bancaire est
        // desormais obligatoire des l'inscription, useArtisan.ts y renverrait
        // de toute facon tant qu'aucun abonnement Stripe n'existe -- sauf via
        // un lien d'invitation, deja gere ci-dessus.
        window.location.href = codeInvitation ? "/" : "/abonnement";
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
            <input
              className="field"
              type="password"
              name="password"
              autoComplete={mode === "inscription" ? "new-password" : "current-password"}
              placeholder="Mot de passe"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
          )}

          {mode === "inscription" && (
            <input
              className="field"
              type="password"
              name="confirmation-password"
              autoComplete="new-password"
              placeholder="Confirmer le mot de passe"
              value={confirmationMotDePasse}
              onChange={(e) => setConfirmationMotDePasse(e.target.value)}
            />
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
