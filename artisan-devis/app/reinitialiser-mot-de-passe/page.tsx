"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ReinitialiserMotDePasse() {
  const router = useRouter();
  const [pret, setPret] = useState(false);
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);
  const [reussi, setReussi] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setPret(true);
      if (!session) {
        setMessage("Ce lien est invalide ou a expiré. Redemande un email depuis la page de connexion.");
      }
    });
  }, []);

  async function valider() {
    setMessage("");

    if (motDePasse.length < 6) {
      setMessage("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (motDePasse !== confirmation) {
      setMessage("Les deux mots de passe ne sont pas identiques.");
      return;
    }

    setChargement(true);
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setChargement(false);

    if (error) {
      setMessage("Erreur : " + error.message);
      return;
    }

    setReussi(true);
    setMessage("Mot de passe mis à jour !");
    setTimeout(() => router.push("/"), 2000);
  }

  return (
    <main className="page-shell" style={{ paddingTop: 60 }}>
      <h1 className="page-title" style={{ textAlign: "center" }}>
        VolpeVox
      </h1>

      <div className="card">
        <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 16, color: "var(--ink)" }}>
          Choisir un nouveau mot de passe
        </h2>

        {pret && !reussi && (
          <>
            <input
              className="field"
              type="password"
              placeholder="Nouveau mot de passe"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
            <input
              className="field"
              type="password"
              placeholder="Confirme le mot de passe"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />

            <button className="btn btn-primary" onClick={valider} disabled={chargement} style={{ width: "100%" }}>
              Valider
            </button>
          </>
        )}

        {message && <p className="message">{message}</p>}
      </div>
    </main>
  );
}
