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
  // Societe (SARL, SAS...) plutot qu'entrepreneur individuel, et sa forme
  // juridique ("SARL"), pour pre-remplir "Forme et capital".
  estSociete: boolean;
  formeJuridique: string;
  adresse: string;
  codePostal: string;
  ville: string;
  siret: string;
}

interface Resultat {
  titre: string;
  // Ligne d'adresse affichee dans la liste : "8 Rue des Artisans, 69003 Lyon".
  lieu: string;
  // Code d'activite INSEE ("43.22A"), traduit en clair a l'affichage.
  codeActivite: string;
  infos: InfosEntreprise;
}

// Certains entrepreneurs ont demande a ne pas etre publics : l'annuaire
// renvoie alors "[NON-DIFFUSIBLE]" a la place de l'info. On l'efface.
function diffusible(texte: string | null | undefined) {
  return texte && !String(texte).includes("NON-DIFFUSIBLE") ? String(texte) : "";
}

// Petits mots laisses en minuscules (sauf en debut) : "Rue des Artisans".
const PETITS_MOTS = new Set(["de", "des", "du", "la", "le", "les", "et", "d", "l", "à", "au", "aux", "en", "sur", "sous"]);

// "8 RUE DES ARTISANS" -> "8 Rue des Artisans" (l'annuaire est en majuscules).
function casse(texte: string | null | undefined) {
  return diffusible(texte)
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

// Code "nature juridique" de l'INSEE -> forme courte. Codes les plus
// frequents chez les artisans ; vide sinon (l'artisan la tape lui-meme).
function formeJuridique(code: string) {
  if (code === "5498") return "EURL";
  if (code.startsWith("54")) return "SARL";
  if (code === "5710") return "SAS";
  if (code === "5720") return "SASU";
  if (code.startsWith("55") || code.startsWith("56")) return "SA";
  if (code.startsWith("52")) return "SNC";
  return "";
}

// Recherche filtree par ville : l'entreprise peut avoir ete trouvee grace a
// un autre etablissement que son siege (ex : siege a Nice, atelier a Paris).
// On garde alors l'etablissement ouvert de la ville tapee (le siege s'il
// y est).
function etablissementDe(e: any, filtreLieu: boolean) {
  const ouverts = filtreLieu ? (e.matching_etablissements || []).filter((m: any) => m.etat_administratif === "A") : [];
  const trouve = ouverts.some((m: any) => m.est_siege) ? null : ouverts[0];
  if (!trouve) return e.siege || {};
  // Son adresse arrive en un bloc "55 BD DE CHARONNE 75011 PARIS" : on
  // retire le code postal et la ville de la fin.
  const rue = String(trouve.adresse || "").split(` ${trouve.code_postal}`)[0];
  return { ...trouve, libelle_voie: rue };
}

function versInfos(e: any, filtreLieu = false): InfosEntreprise {
  const s = etablissementDe(e, filtreLieu);
  const adresse = [s.numero_voie, s.indice_repetition, s.type_voie, s.libelle_voie].filter(Boolean).join(" ");
  // Nature juridique 1xxx = entrepreneur individuel (micro-entreprise
  // comprise) : le nom de l'entreprise est celui de la personne.
  const individuel = String(e.nature_juridique || "").startsWith("1");
  const dirigeant = (e.dirigeants || []).find((d: any) => d.type_dirigeant === "personne physique");
  const prenom = dirigeant ? casse(String(dirigeant.prenoms || "").split(/\s+/)[0]) : "";
  const nom = dirigeant ? casse(sansParentheses(dirigeant.nom)) : "";
  const personne = `${prenom} ${nom}`.trim();
  // Entrepreneur individuel : son nom commercial ("DUPONT RENOV") devient le
  // nom de l'entreprise. Pas les parentheses du nom complet, qui peuvent
  // aussi etre un nom de naissance ("SYLVIE MARTIN (DUPONT)"). "E.I MARTIN
  // DUPONT" n'est pas un vrai nom commercial : on l'ignore.
  const commercial = individuel
    ? diffusible(s.nom_commercial) ||
      diffusible(e.siege?.nom_commercial) ||
      diffusible((s.liste_enseignes || []).find((x: string) => diffusible(x)))
    : "";
  const nomCommercial = /^E\.?\s?I\.?\s/i.test(commercial) || casse(commercial) === personne ? "" : commercial;
  return {
    nomComplet: personne || casse(sansParentheses(e.nom_complet)),
    prenom,
    nom,
    nomEntreprise: individuel ? casse(nomCommercial) : casse(e.nom_raison_sociale || e.nom_complet),
    estSociete: !individuel,
    formeJuridique: individuel ? "" : formeJuridique(String(e.nature_juridique || "")),
    adresse: casse(adresse || s.complement_adresse),
    codePostal: diffusible(s.code_postal),
    ville: casse(s.libelle_commune),
    siret: diffusible(s.siret),
  };
}

// "Saint-Étienne" -> "saint etienne" : pour comparer des noms de villes.
function simplifier(texte: string) {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Ville tapee en lettres -> ses codes postaux (API geo de l'Etat, gratuite).
// On passe par les codes postaux car Paris, Lyon et Marseille sont decoupes
// en arrondissements dans l'annuaire. Toutes les communes du meme nom sont
// gardees (Saint-Denis 93 et 974). Memorise pour ne pas redemander.
const codesPostauxVilles = new Map<string, string[]>();
async function codesPostauxDe(ville: string) {
  const cle = simplifier(ville);
  if (codesPostauxVilles.has(cle)) return codesPostauxVilles.get(cle)!;
  const reponse = await fetch(
    `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(ville)}&fields=nom,codesPostaux&boost=population&limit=10`
  );
  const communes: { nom: string; codesPostaux?: string[] }[] = await reponse.json();
  const memeNom = communes.filter((c) => simplifier(c.nom) === cle);
  const gardees = memeNom.length ? memeNom : communes.slice(0, 1);
  const codes = Array.from(new Set(gardees.flatMap((c) => c.codesPostaux || [])));
  codesPostauxVilles.set(cle, codes);
  return codes;
}

// onPasTrouve : "Je ne me trouve pas" touche (ou recherche en panne), l'ecran
// affiche alors les champs a remplir a la main, SIRET compris.
export function RechercheEntreprise({
  onChoisir,
  onPasTrouve,
}: {
  onChoisir: (infos: InfosEntreprise) => void;
  onPasTrouve?: () => void;
}) {
  const [texte, setTexte] = useState("");
  const [lieu, setLieu] = useState("");
  const [resultats, setResultats] = useState<Resultat[]>([]);
  const [etat, setEtat] = useState<"" | "recherche" | "aucun" | "ville" | "erreur">("");
  const [choisi, setChoisi] = useState("");
  const demande = useRef(0);
  // Liste officielle des activites (INSEE), chargee seulement ici pour ne
  // pas alourdir le reste de l'appli.
  const [activites, setActivites] = useState<Record<string, string>>({});
  useEffect(() => {
    import("@/lib/activitesNaf.json").then((m) => setActivites(m.default as Record<string, string>));
  }, []);

  // Recherche automatique 400 ms apres la derniere frappe.
  useEffect(() => {
    const q = texte.trim();
    const chiffres = q.replace(/\s/g, "");
    const parNumero = /^\d{9}$|^\d{14}$/.test(chiffres);
    if ((q.length < 3 && !parNumero) || choisi) {
      setResultats([]);
      setEtat("");
      return;
    }
    const numero = ++demande.current;
    const minuteur = setTimeout(async () => {
      setEtat("recherche");
      try {
        const params = new URLSearchParams({ q: parNumero ? chiffres : q, per_page: "5", etat_administratif: "A" });
        // SIRET ou SIREN tape : le numero suffit, la ville est ignoree.
        const l = lieu.trim();
        if (!parNumero && l) {
          if (/^\d{5}$/.test(l)) params.set("code_postal", l);
          else if (/^(\d{2}|2[ab]|97\d)$/i.test(l)) params.set("departement", l.toUpperCase());
          else if (l.length >= 2) {
            const codes = await codesPostauxDe(l);
            if (numero !== demande.current) return;
            if (!codes.length) {
              setResultats([]);
              setEtat("ville");
              return;
            }
            params.set("code_postal", codes.join(","));
          }
        }
        const reponse = await fetch(`https://recherche-entreprises.api.gouv.fr/search?${params}`);
        const donnees = await reponse.json();
        if (numero !== demande.current) return;
        const filtreLieu = params.has("code_postal") || params.has("departement");
        const liste: Resultat[] = (donnees.results || []).map((e: any) => {
          const infos = versInfos(e, filtreLieu);
          const s = etablissementDe(e, filtreLieu);
          return {
            // Entrepreneur individuel : "Martin Dupont", ou "Jean Dupont · Dupont Renov"
            // s'il a un nom commercial. Societe : sa raison sociale.
            titre: infos.estSociete
              ? infos.nomEntreprise
              : [infos.nomComplet, infos.nomEntreprise].filter(Boolean).join(" · "),
            lieu: [infos.adresse, [infos.codePostal, infos.ville].filter(Boolean).join(" ")].filter(Boolean).join(", "),
            codeActivite: s.activite_principale || e.activite_principale || "",
            infos,
          };
        });
        setResultats(liste);
        setEtat(liste.length ? "" : "aucun");
      } catch {
        if (numero === demande.current) {
          setEtat("erreur");
          onPasTrouve?.();
        }
      }
    }, 400);
    return () => clearTimeout(minuteur);
  }, [texte, lieu, choisi]);

  return (
    <div className="recherche-entreprise">
      <div className="champ">
        <label className="champ-label" htmlFor="re-nom">
          Nom de ton entreprise ou ton nom
        </label>
        <input
          id="re-nom"
          className="field"
          placeholder="Ex : Dupont Rénovation, Martin Dupont…"
          value={texte}
          onChange={(e) => {
            setChoisi("");
            setTexte(e.target.value);
          }}
          autoComplete="off"
        />
      </div>
      <div className="champ">
        <label className="champ-label" htmlFor="re-lieu">
          Ville ou code postal
        </label>
        <input
          id="re-lieu"
          className="field"
          placeholder="Ex : Lyon, 69003…"
          value={lieu}
          onChange={(e) => {
            setChoisi("");
            setLieu(e.target.value);
          }}
          autoComplete="off"
        />
        <p className="champ-aide">Tu connais ton SIRET ? Tape-le directement dans la première case.</p>
      </div>
      {etat === "recherche" && <p className="champ-aide">Recherche…</p>}
      {etat === "aucun" && (
        <p className="champ-aide">Aucune entreprise trouvée. Vérifie l'orthographe ou la ville.</p>
      )}
      {etat === "ville" && <p className="champ-aide">Ville introuvable : vérifie l'orthographe ou tape le code postal.</p>}
      {etat === "erreur" && <p className="champ-aide">Recherche indisponible pour le moment : remplis les champs ci-dessous.</p>}
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
              {r.lieu && <small>{r.lieu}</small>}
              {activites[r.codeActivite] && <small className="recherche-entreprise-activite">{activites[r.codeActivite]}</small>}
            </button>
          ))}
        </div>
      )}
      {onPasTrouve && !choisi && (
        <button type="button" className="recherche-entreprise-pas-trouve" onClick={onPasTrouve}>
          Je ne me trouve pas
        </button>
      )}
    </div>
  );
}
