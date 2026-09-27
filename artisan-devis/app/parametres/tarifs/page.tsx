"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { useArtisanSession } from "@/lib/useArtisan";
import { UNITES } from "@/lib/unites";

// Carnet de prix de l'artisan (table prix_appris) : les tarifs appris tout
// seuls a partir de ses devis, plus ceux qu'il saisit ici (fixe = true, que
// l'apprentissage automatique ne modifie plus -- voir apprendrePrix dans
// app/page.tsx). Necessite supabase/mes-tarifs.sql.

interface Tarif {
  id: string;
  prestation: string;
  unite: string;
  prix_moyen: number;
}

// Tarif en cours d'ajout (id null) ou de modification.
interface Edition {
  id: string | null;
  prestation: string;
  unite: string;
  prix: string;
}

function formaterPrix(prix: number) {
  return prix.toFixed(2).replace(".", ",");
}

function libelleUnite(unite: string) {
  return unite === "forfait" ? "le forfait" : unite;
}

export default function MesTarifs() {
  const { artisanId, loading: chargementSession } = useArtisanSession();
  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [chargement, setChargement] = useState(true);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [confirmerSuppression, setConfirmerSuppression] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState("");

  async function charger() {
    const { data } = await supabase
      .from("prix_appris")
      .select("id, prestation, unite, prix_moyen")
      .eq("artisan_id", artisanId)
      .order("prestation", { ascending: true });
    setTarifs(data || []);
    setChargement(false);
  }

  useEffect(() => {
    if (artisanId) charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artisanId]);

  function ouvrir(tarif: Tarif | null) {
    setMessage("");
    setConfirmerSuppression(false);
    setEdition(
      tarif
        ? { id: tarif.id, prestation: tarif.prestation, unite: tarif.unite, prix: formaterPrix(tarif.prix_moyen) }
        : { id: null, prestation: "", unite: "heure", prix: "" }
    );
  }

  async function enregistrer() {
    if (!edition) return;
    const prestation = edition.prestation.trim();
    const prix = Number(edition.prix.replace(",", ".").replace(/\s/g, ""));
    if (!prestation) {
      setMessage("Donne un nom à ce tarif (ex : Pose carrelage).");
      return;
    }
    if (!prix || prix < 0) {
      setMessage("Indique un prix valide.");
      return;
    }

    setEnCours(true);
    const valeurs = {
      prestation,
      unite: edition.unite,
      prix_moyen: Math.round(prix * 100) / 100,
      fixe: true,
      updated_at: new Date().toISOString(),
    };

    // Un tarif du meme nom et de la meme unite existe deja (souvent appris
    // tout seul) : on le met a jour plutot que d'en creer un doublon.
    let idCible = edition.id;
    if (!idCible) {
      const doublon = tarifs.find(
        (t) => t.prestation.toLowerCase() === prestation.toLowerCase() && t.unite === edition.unite
      );
      idCible = doublon?.id ?? null;
    }

    const { error } = idCible
      ? await supabase.from("prix_appris").update(valeurs).eq("id", idCible)
      : await supabase
          .from("prix_appris")
          .insert({ ...valeurs, artisan_id: artisanId, nombre_utilisations: 0 });

    setEnCours(false);
    if (error) {
      setMessage("Erreur : " + error.message);
      return;
    }
    setEdition(null);
    await charger();
  }

  async function supprimer() {
    if (!edition?.id) return;
    setEnCours(true);
    const { error } = await supabase.from("prix_appris").delete().eq("id", edition.id);
    setEnCours(false);
    if (error) {
      setMessage("Erreur : " + error.message);
      return;
    }
    setEdition(null);
    await charger();
  }

  if (chargementSession || chargement) {
    return (
      <main className="page-shell">
        <Topbar />
        <p className="message">Chargement...</p>
      </main>
    );
  }

  const formulaire = edition && (
    <div className="card">
      <div className="champ">
        <label className="champ-label">Nom du tarif</label>
        <input
          className="field"
          placeholder="Ex : Pose carrelage, Agent de sécurité…"
          value={edition.prestation}
          onChange={(e) => setEdition({ ...edition, prestation: e.target.value })}
        />
      </div>
      <div className="champ champ-duo">
        <div>
          <label className="champ-label">Prix (€)</label>
          <input
            className="field"
            inputMode="decimal"
            placeholder="0,00"
            value={edition.prix}
            onChange={(e) => setEdition({ ...edition, prix: e.target.value })}
          />
        </div>
        <div>
          <label className="champ-label">Par</label>
          <select
            className="field"
            value={edition.unite}
            onChange={(e) => setEdition({ ...edition, unite: e.target.value })}
          >
            {UNITES.map((u) => (
              <option key={u.valeur} value={u.valeur}>
                {u.libelle}
              </option>
            ))}
            {!UNITES.some((u) => u.valeur === edition.unite) && (
              <option value={edition.unite}>{edition.unite}</option>
            )}
          </select>
        </div>
      </div>

      {message && <p className="message">{message}</p>}

      <button type="button" className="btn btn-primary btn-bloc" onClick={enregistrer} disabled={enCours}>
        Enregistrer
      </button>
      <button
        type="button"
        className="btn btn-outline btn-bloc"
        onClick={() => setEdition(null)}
        disabled={enCours}
        style={{ marginTop: 8 }}
      >
        Annuler
      </button>
      {edition.id && (
        <button
          type="button"
          onClick={() => (confirmerSuppression ? supprimer() : setConfirmerSuppression(true))}
          disabled={enCours}
          style={{
            display: "block",
            margin: "14px auto 0",
            background: "none",
            border: "none",
            color: "var(--danger)",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {confirmerSuppression ? "Confirmer la suppression" : "Supprimer ce tarif"}
        </button>
      )}
    </div>
  );

  return (
    <main className="page-shell">
      <Topbar />

      <h1 className="page-title">Mes tarifs</h1>
      <p className="hint" style={{ marginTop: 0 }}>
        Quand tu dictes un devis, l'IA reprend ces prix toute seule. Ils se remplissent aussi automatiquement à partir
        de tes devis.
      </p>

      {edition && !edition.id && formulaire}

      {!edition && (
        <button type="button" className="btn btn-outline btn-bloc" onClick={() => ouvrir(null)}>
          + Ajouter un tarif
        </button>
      )}

      {tarifs.length === 0 ? (
        !edition && (
          <p className="hint" style={{ textAlign: "center", marginTop: 20 }}>
            Aucun tarif pour l'instant.
          </p>
        )
      ) : (
        <div className="reglages-liste" style={{ marginTop: 16 }}>
          {tarifs.map((t) =>
            edition?.id === t.id ? (
              <div key={t.id} style={{ padding: 4 }}>
                {formulaire}
              </div>
            ) : (
              <button type="button" key={t.id} className="reglages-item" onClick={() => ouvrir(t)}>
                <span className="reglages-item-corps">
                  <span className="reglages-item-titre">{t.prestation}</span>
                </span>
                <span className="reglages-item-fin">
                  <span className="reglages-item-statut" style={{ whiteSpace: "nowrap" }}>
                    {formaterPrix(t.prix_moyen)} € / {libelleUnite(t.unite)}
                  </span>
                </span>
              </button>
            )
          )}
        </div>
      )}
    </main>
  );
}
