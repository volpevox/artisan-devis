"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { SplashEcran } from "@/components/SplashEcran";

export default function Connexion() {
  const router = useRouter();
  const [mode, setMode] = useState<"connexion" | "inscription" | "oubli">("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);
  const [afficherDemarrage, setAfficherDemarrage] = useState(true);

  async function valider(e: FormEvent) {
    e.preventDefault();
    setMessage("");
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
        router.push("/profil");
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

    router.push("/");
  }

  if (afficherDemarrage) {
    return <SplashEcran onContinuer={() => setAfficherDemarrage(false)} />;
  }

  return (
    <main className="page-shell" style={{ justifyContent: "center" }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <img src="/fox-icon.png" alt="" aria-hidden="true" className="connexion-logo" />
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
