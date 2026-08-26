"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { useArtisanSession } from "@/lib/useArtisan";
import { IconeOeil } from "@/components/IconeOeil";

export default function ChangerMotDePasse() {
  const { session, loading: chargementSession } = useArtisanSession();
  const [ancienMotDePasse, setAncienMotDePasse] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState("");
  const [message, setMessage] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [afficherAncien, setAfficherAncien] = useState(false);
  const [afficherNouveau, setAfficherNouveau] = useState(false);
  const [afficherConfirmation, setAfficherConfirmation] = useState(false);

  async function valider() {
    setMessage("");

    if (!ancienMotDePasse) {
      setMessage("Merci de saisir ton mot de passe actuel.");
      return;
    }
    if (nouveauMotDePasse.length < 6) {
      setMessage("Le nouveau mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (nouveauMotDePasse !== confirmationMotDePasse) {
      setMessage("Les deux mots de passe ne sont pas identiques.");
      return;
    }

    const email = session?.user?.email;
    if (!email) {
      setMessage("Session invalide, reconnecte-toi.");
      return;
    }

    setEnCours(true);

    // Verifie l'ancien mot de passe en tentant une connexion avec -- Supabase
    // n'a pas d'API dediee "vérifier le mot de passe actuel", se reconnecter
    // avec les memes identifiants est le moyen standard de le confirmer sans
    // creer de nouvelle session parallele.
    const { error: erreurVerif } = await supabase.auth.signInWithPassword({ email, password: ancienMotDePasse });

    if (erreurVerif) {
      setMessage("Mot de passe actuel incorrect.");
      setEnCours(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: nouveauMotDePasse });
    setEnCours(false);

    if (error) {
      setMessage("Erreur : " + error.message);
      return;
    }

    setAncienMotDePasse("");
    setNouveauMotDePasse("");
    setConfirmationMotDePasse("");
    setMessage("Mot de passe mis à jour !");
  }

  if (chargementSession) {
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

      <h1 className="page-title">Mot de passe</h1>

      <div className="card">
        <label className="field-label">
          Mot de passe actuel
          <div className="champ-mot-de-passe" style={{ marginTop: 6 }}>
            <input
              className="field"
              style={{ marginBottom: 0 }}
              type={afficherAncien ? "text" : "password"}
              autoComplete="current-password"
              value={ancienMotDePasse}
              onChange={(e) => setAncienMotDePasse(e.target.value)}
            />
            <button
              type="button"
              className="champ-oeil"
              onClick={() => setAfficherAncien((v) => !v)}
              aria-label={afficherAncien ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              <IconeOeil ouvert={afficherAncien} />
            </button>
          </div>
        </label>
        <label className="field-label">
          Nouveau mot de passe
          <div className="champ-mot-de-passe" style={{ marginTop: 6 }}>
            <input
              className="field"
              style={{ marginBottom: 0 }}
              type={afficherNouveau ? "text" : "password"}
              autoComplete="new-password"
              value={nouveauMotDePasse}
              onChange={(e) => setNouveauMotDePasse(e.target.value)}
            />
            <button
              type="button"
              className="champ-oeil"
              onClick={() => setAfficherNouveau((v) => !v)}
              aria-label={afficherNouveau ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              <IconeOeil ouvert={afficherNouveau} />
            </button>
          </div>
        </label>
        <label className="field-label">
          Confirme le nouveau mot de passe
          <div className="champ-mot-de-passe" style={{ marginTop: 6 }}>
            <input
              className="field"
              style={{ marginBottom: 0 }}
              type={afficherConfirmation ? "text" : "password"}
              autoComplete="new-password"
              value={confirmationMotDePasse}
              onChange={(e) => setConfirmationMotDePasse(e.target.value)}
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
        </label>

        <button className="btn btn-primary" onClick={valider} disabled={enCours}>
          Mettre à jour le mot de passe
        </button>

        {message && <p className="message">{message}</p>}
      </div>
    </main>
  );
}
