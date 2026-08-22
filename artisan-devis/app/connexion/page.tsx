"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Connexion() {
  const router = useRouter();
  const [mode, setMode] = useState<"connexion" | "inscription">("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);

  async function valider() {
    setMessage("");
    setChargement(true);

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

  return (
    <main className="page-shell" style={{ paddingTop: 60 }}>
      <h1 className="page-title" style={{ textAlign: "center" }}>
        VolpeVox
      </h1>

      <div className="card">
        <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 16, color: "var(--ink)" }}>
          {mode === "connexion" ? "Se connecter" : "Créer un compte"}
        </h2>

        <input
          className="field"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="field"
          type="password"
          placeholder="Mot de passe"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
        />

        <button className="btn btn-primary" onClick={valider} disabled={chargement} style={{ width: "100%" }}>
          {mode === "connexion" ? "Se connecter" : "Créer mon compte"}
        </button>

        {message && <p className="message">{message}</p>}

        <p style={{ marginTop: 16, fontSize: 13.5, textAlign: "center" }}>
          {mode === "connexion" ? (
            <>
              Pas encore de compte ?{" "}
              <button
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
