"use client";
import { useEffect, useRef, useState } from "react";

// Recherche dans l'annuaire officiel des entreprises (API publique et
// gratuite de l'Etat, sans cle : recherche-entreprises.api.gouv.fr). Par
// SIRET, SIREN ou nom : l'artisan choisit son entreprise et on pre-remplit
// son profil (nom, entreprise, adresse, SIRET). Il verifie ensuite.

export interface InfosEntreprise {
  nomComplet: string;
  prenom: string;
  nom: string;
  nomEntreprise: string;
  adresse: string;
  codePostal: string;
  ville: string;
  siret: string;
}

interface Resultat {
  titre: string;
  detail: string;
  infos: InfosEntreprise;
}

// Petits mots laisses en minuscules (sauf en debut) : "Rue des Artisans".
const PETITS_MOTS = new Set(["de", "des", "du", "la", "le", "les", "et", "d", "l", "à", "au", "aux", "en", "sur", "sous"]);

// "8 RUE DES ARTISANS" -> "8 Rue des Artisans" (l'annuaire est en majuscules).
function casse(texte: string | null | undefined) {
  return (texte || "")
    .toLowerCase()
    .replace(/(^|[\s\-'’])([a-zà-öø-ÿ]+)/g, (tout, sep, mot, position) =>
      position > 0 && PETITS_MOTS.has(mot) ? tout : sep + mot[0].toUpperCase() + mot.slice(1)
    )
    .trim();
}

// "DUPONT (MARTIN)" -> "Dupont" : nom d'usage entre parentheses retire.
function sansParentheses(texte: string | null | undefined) {
  return (texte || "").replace(/\s*\(.*?\)\s*/g, " ").trim();
}

function versInfos(e: any): InfosEntreprise {
  const s = e.siege || {};
  const adresse = [s.numero_voie, s.indice_repetition, s.type_voie, s.libelle_voie].filter(Boolean).join(" ");
  // Nature juridique 1xxx = entrepreneur individuel (micro-entreprise
  // comprise) : le nom de l'entreprise est celui de la personne.
  const individuel = String(e.nature_juridique || "").startsWith("1");
  const dirigeant = (e.dirigeants || []).find((d: any) => d.type_dirigeant === "personne physique");
  const prenom = dirigeant ? casse(String(dirigeant.prenoms || "").split(/\s+/)[0]) : "";
  const nom = dirigeant ? casse(sansParentheses(dirigeant.nom)) : "";
  const personne = `${prenom} ${nom}`.trim();
  // Entrepreneur individuel : "JEAN DUPONT (DUPONT RENOV)" -> le nom
  // commercial entre parentheses devient le nom de l'entreprise.
  const nomCommercial = individuel ? (String(e.nom_complet || "").match(/\(([^)]+)\)/)?.[1] ?? "") : "";
  return {
    nomComplet: personne || casse(sansParentheses(e.nom_complet)),
    prenom,
    nom,
    nomEntreprise: individuel ? casse(nomCommercial) : casse(e.nom_raison_sociale || e.nom_complet),
    adresse: casse(adresse || s.complement_adresse),
    codePostal: s.code_postal || "",
    ville: casse(s.libelle_commune),
    siret: s.siret || "",
  };
}

export function RechercheEntreprise({ onChoisir }: { onChoisir: (infos: InfosEntreprise) => void }) {
  const [texte, setTexte] = useState("");
  const [resultats, setResultats] = useState<Resultat[]>([]);
  const [etat, setEtat] = useState<"" | "recherche" | "aucun" | "erreur">("");
  const [choisi, setChoisi] = useState("");
  const demande = useRef(0);

  // Recherche automatique 400 ms apres la derniere frappe.
  useEffect(() => {
    const q = texte.trim();
    const chiffres = q.replace(/\s/g, "");
    if (q.length < 3 || choisi) {
      setResultats([]);
      setEtat("");
      return;
    }
    const numero = ++demande.current;
    const minuteur = setTimeout(async () => {
      setEtat("recherche");
      try {
        const requete = /^\d{9,14}$/.test(chiffres) ? chiffres : q;
        const reponse = await fetch(
          `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(requete)}&per_page=5&etat_administratif=A`
        );
        const donnees = await reponse.json();
        if (numero !== demande.current) return;
        const liste: Resultat[] = (donnees.results || []).map((e: any) => ({
          titre: casse(e.nom_complet),
          detail: [e.siege?.code_postal, casse(e.siege?.libelle_commune)].filter(Boolean).join(" "),
          infos: versInfos(e),
        }));
        setResultats(liste);
        setEtat(liste.length ? "" : "aucun");
      } catch {
        if (numero === demande.current) setEtat("erreur");
      }
    }, 400);
    return () => clearTimeout(minuteur);
  }, [texte, choisi]);

  return (
    <div className="recherche-entreprise">
      <input
        className="field"
        placeholder="Ton SIRET ou le nom de ton entreprise"
        value={texte}
        onChange={(e) => {
          setChoisi("");
          setTexte(e.target.value);
        }}
        autoComplete="off"
      />
      {etat === "recherche" && <p className="champ-aide">Recherche…</p>}
      {etat === "aucun" && (
        <p className="champ-aide">Aucune entreprise trouvée. Vérifie le numéro, ou remplis les champs ci-dessous.</p>
      )}
      {etat === "erreur" && <p className="champ-aide">Recherche indisponible : remplis les champs ci-dessous.</p>}
      {choisi && <p className="recherche-entreprise-ok">✓ {choisi} — vérifie les infos ci-dessous</p>}
      {resultats.length > 0 && (
        <div className="recherche-entreprise-liste">
          {resultats.map((r) => (
            <button
              key={r.infos.siret || r.titre}
              type="button"
              onClick={() => {
                onChoisir(r.infos);
                setChoisi(r.titre);
                setResultats([]);
              }}
            >
              <strong>{r.titre}</strong>
              <small>
                {r.detail}
                {r.infos.siret ? ` · SIRET ${r.infos.siret}` : ""}
              </small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
