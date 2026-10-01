"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import s from "./admin.module.css";

// Tableau de bord prive de Marley. La page ne contient AUCUNE donnee : tout
// vient de /api/admin, qui verifie cote serveur que la session est celle de
// ADMIN_EMAIL. Toute autre personne est renvoyee vers l'accueil.

type Compte = {
  userId: string;
  artisanId: string | null;
  email: string;
  connexion: string;
  entreprise: string | null;
  nom: string | null;
  telephone: string | null;
  ville: string | null;
  inscritLe: string;
  derniereActivite: string | null;
  derniereOuverture: string | null;
  joursInactif: number;
  statut: "nouveau" | "jamais" | "actif" | "inactif";
  profilRempli: boolean;
  nbDevis: number;
  nbEnvoyes: number;
  nbSignes: number;
  nbFactures: number;
  montantDevis: number;
  montantSigne: number;
  premierDevisLe: string | null;
  semainesActives: number;
  logo: boolean;
  paiementEnLigne: boolean;
  notifications: boolean;
  nbDictees: number;
  premiereDicteeLe: string | null;
  provenance: string;
  provenanceDetail: string;
};

type Donnees = {
  genereLe: string;
  chiffres: Record<string, number | null>;
  entonnoir: { etape: string; nb: number }[];
  parJour: { jour: string; inscrits: number; devis: number }[];
  provenances: Record<string, number>;
  comptes: Compte[];
};

type Document = {
  id: string;
  statut: string | null;
  total: number | null;
  created_at: string;
  est_facture: boolean | null;
  signe_le: string | null;
  payee_le: string | null;
  numero_devis: string | null;
  numero_facture: string | null;
  avoir_numero: string | null;
};

const euros = (n: number | null | undefined) =>
  (n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const nombre = (n: number | null | undefined) => (n || 0).toLocaleString("fr-FR");
const date = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" }) : "—";
const dateHeure = (d: string | null) =>
  d
    ? new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";

function ilYA(d: string | null) {
  if (!d) return "jamais";
  const min = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (min < 60) return `il y a ${Math.max(min, 1)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return `il y a ${j} j`;
}

function delai(heures: number | null | undefined) {
  if (heures === null || heures === undefined) return "—";
  if (heures < 1) return `${Math.max(Math.round(heures * 60), 1)} min`;
  if (heures < 48) return `${Math.round(heures)} h`;
  return `${Math.round(heures / 24)} j`;
}

function Badge({ c }: { c: Compte }) {
  const libelle =
    c.statut === "nouveau"
      ? "Nouveau"
      : c.statut === "actif"
      ? "Actif"
      : c.statut === "jamais"
      ? "Jamais utilisé"
      : `Inactif depuis ${c.joursInactif} j`;
  return <span className={`${s.badge} ${s["badge_" + c.statut]}`}>{libelle}</span>;
}

const TRIS = [
  { cle: "inscription", libelle: "Inscription" },
  { cle: "activite", libelle: "Activité" },
  { cle: "devis", libelle: "Devis" },
  { cle: "montant", libelle: "Montant" },
] as const;
type Tri = (typeof TRIS)[number]["cle"];

const FILTRES = [
  { cle: "tous", libelle: "Tous" },
  { cle: "nouveau", libelle: "Nouveaux" },
  { cle: "actif", libelle: "Actifs" },
  { cle: "inactif", libelle: "Inactifs" },
  { cle: "jamais", libelle: "Jamais utilisé" },
] as const;
type Filtre = (typeof FILTRES)[number]["cle"];

export default function AdminPage() {
  const router = useRouter();
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [tri, setTri] = useState<Tri>("inscription");
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [serie, setSerie] = useState<"inscrits" | "devis">("inscrits");
  const [barre, setBarre] = useState<number | null>(null);
  const [ouvert, setOuvert] = useState<Compte | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur("");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.replace("/connexion");
      return;
    }
    try {
      const rep = await fetch("/api/admin", { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (rep.status === 403 || rep.status === 401) {
        router.replace("/");
        return;
      }
      if (!rep.ok) throw new Error();
      setDonnees(await rep.json());
    } catch {
      setErreur("Impossible de charger les chiffres. Réessaie dans un instant.");
    }
    setChargement(false);
  }, [router]);

  useEffect(() => {
    charger();
  }, [charger]);

  const comptes = useMemo(() => {
    if (!donnees) return [];
    const liste = donnees.comptes.filter((c) => filtre === "tous" || c.statut === filtre);
    const cle = (c: Compte) =>
      tri === "inscription"
        ? c.inscritLe
        : tri === "activite"
        ? c.derniereActivite || ""
        : tri === "devis"
        ? c.nbDevis + c.nbFactures
        : c.montantDevis;
    return [...liste].sort((a, b) => (cle(a) < cle(b) ? 1 : cle(a) > cle(b) ? -1 : 0));
  }, [donnees, tri, filtre]);

  if (!donnees) {
    return (
      <main className="page-shell">
        <Topbar />
        <div className={s.vide}>
          {erreur ? (
            <>
              <p>{erreur}</p>
              <button className="btn-ghost" onClick={charger}>
                Réessayer
              </button>
            </>
          ) : (
            <p>Chargement…</p>
          )}
        </div>
      </main>
    );
  }

  const c = donnees.chiffres;
  const inscrits = c.inscrits || 0;
  const pct = (n: number | null | undefined) => (inscrits ? `${Math.round(((n || 0) / inscrits) * 100)} %` : "—");

  const valeurs = donnees.parJour.map((j) => j[serie]);
  const max = Math.max(1, ...valeurs);
  const totalPeriode = valeurs.reduce((a, b) => a + b, 0);
  const premierEtape = donnees.entonnoir[0]?.nb || 0;
  const provenances = Object.entries(donnees.provenances).sort((a, b) => b[1] - a[1]);
  const maxProvenance = Math.max(1, ...provenances.map((p) => p[1]));

  return (
    <main className="page-shell">
      <Topbar />
      <div className={s.admin}>
        <div className={s.entete}>
          <div>
            <h1 className={s.titre}>Tableau de bord</h1>
            <p className={s.sousTitre}>
              {chargement ? "Mise à jour…" : `Mis à jour ${dateHeure(donnees.genereLe)}`}
            </p>
          </div>
          <button
            className={s.rafraichir}
            onClick={charger}
            disabled={chargement}
            aria-label="Rafraîchir les chiffres"
          >
            <svg viewBox="0 0 24 24" className={chargement ? s.tourne : ""} aria-hidden="true">
              <path
                d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        {erreur && <p className={s.erreur}>{erreur}</p>}

        {/* Chiffre principal + inscriptions recentes */}
        <div className={s.hero}>
          <p className={s.heroLibelle}>Inscrits</p>
          <p className={s.heroValeur}>{nombre(inscrits)}</p>
          <div className={s.heroLigne}>
            <span>
              <b>+{c.inscritsAujourdhui}</b> aujourd'hui
            </span>
            <span>
              <b>+{c.inscrits7j}</b> 7 j
            </span>
            <span>
              <b>+{c.inscrits30j}</b> 30 j
            </span>
          </div>
        </div>

        <h2 className={s.section}>Utilisation</h2>
        <div className={s.grille}>
          <Tuile libelle="Comptes actifs" valeur={nombre(c.comptesActifs)} note={`${pct(c.comptesActifs)} ont fait 1 devis`} />
          <Tuile libelle="Actifs cette semaine" valeur={nombre(c.actifs7j)} note={`${nombre(c.actifs30j)} sur 30 jours`} />
          <Tuile libelle="Sont revenus" valeur={nombre(c.revenus)} note="devis sur 2 semaines ou +" />
          <Tuile libelle="1er devis après" valeur={delai(c.delaiMedianHeures)} note="délai médian d'inscription" />
          <Tuile libelle="Dictées" valeur={nombre(c.dictees)} note="depuis l'ajout du suivi" />
          <Tuile libelle="Factures payées" valeur={nombre(c.facturesPayees)} note={`sur ${nombre(c.factures)} factures`} />
        </div>

        <h2 className={s.section}>Documents</h2>
        <div className={s.grille4}>
          <Tuile libelle="Devis" valeur={nombre(c.devis)} />
          <Tuile libelle="Envoyés" valeur={nombre(c.devisEnvoyes)} />
          <Tuile libelle="Signés" valeur={nombre(c.devisSignes)} />
          <Tuile libelle="Factures" valeur={nombre(c.factures)} />
        </div>

        <h2 className={s.section}>Argent passé par VolpeVox (HT)</h2>
        <div className={s.grille}>
          <Tuile libelle="Devis créés" valeur={euros(c.montantDevis)} />
          <Tuile libelle="Devis signés" valeur={euros(c.montantSigne)} />
          <Tuile libelle="Facturé" valeur={euros(c.montantFacture)} />
          <Tuile libelle="Payé en ligne" valeur={euros(c.montantPayeEnLigne)} />
        </div>

        {/* Graphique 30 jours */}
        <div className={s.carte}>
          <div className={s.carteEntete}>
            <h2 className={s.carteTitre}>
              {serie === "inscrits" ? "Inscriptions" : "Documents créés"} · 30 jours
            </h2>
            <span className={s.carteTotal}>{totalPeriode}</span>
          </div>
          <div className={s.onglets} role="tablist">
            <button
              role="tab"
              aria-selected={serie === "inscrits"}
              className={serie === "inscrits" ? s.ongletActif : s.onglet}
              onClick={() => {
                setSerie("inscrits");
                setBarre(null);
              }}
            >
              Inscriptions
            </button>
            <button
              role="tab"
              aria-selected={serie === "devis"}
              className={serie === "devis" ? s.ongletActif : s.onglet}
              onClick={() => {
                setSerie("devis");
                setBarre(null);
              }}
            >
              Documents créés
            </button>
          </div>
          <p className={s.bulle}>
            {barre !== null
              ? `${new Date(donnees.parJour[barre].jour).toLocaleDateString("fr-FR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })} : ${valeurs[barre]} ${serie === "inscrits" ? "inscription(s)" : "document(s)"}`
              : "Touche une barre pour voir le jour"}
          </p>
          <div className={s.graphique} onMouseLeave={() => setBarre(null)}>
            <span className={s.graphiqueMax}>{max}</span>
            <div className={s.barres}>
              {valeurs.map((v, i) => (
                <button
                  key={donnees.parJour[i].jour}
                  className={s.colonne}
                  onClick={() => setBarre(i)}
                  onMouseEnter={() => setBarre(i)}
                  aria-label={`${donnees.parJour[i].jour} : ${v}`}
                >
                  <span
                    className={`${s.barre} ${barre === i ? s.barreActive : ""}`}
                    style={{ height: v ? `${Math.max((v / max) * 100, 4)}%` : 0 }}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className={s.axe}>
            <span>{date(donnees.parJour[0].jour)}</span>
            <span>Aujourd'hui</span>
          </div>
        </div>

        {/* Entonnoir */}
        <div className={s.carte}>
          <h2 className={s.carteTitre}>Où les gens décrochent</h2>
          {donnees.entonnoir.map((e, i) => {
            const precedent = i > 0 ? donnees.entonnoir[i - 1].nb : null;
            const perte = precedent ? Math.round(((precedent - e.nb) / precedent) * 100) : null;
            return (
              <div key={e.etape} className={s.etape}>
                <div className={s.etapeLigne}>
                  <span>{e.etape}</span>
                  <span>
                    <b>{e.nb}</b>
                    <span className={s.muted}>
                      {" "}
                      · {premierEtape ? Math.round((e.nb / premierEtape) * 100) : 0} %
                    </span>
                  </span>
                </div>
                <div className={s.piste}>
                  <span
                    className={s.remplissage}
                    style={{ width: premierEtape ? `${(e.nb / premierEtape) * 100}%` : 0 }}
                  />
                </div>
                {perte !== null && perte > 0 && <p className={s.perte}>−{perte} % depuis l'étape d'avant</p>}
              </div>
            );
          })}
        </div>

        {/* Provenance */}
        <div className={s.carte}>
          <h2 className={s.carteTitre}>D'où viennent les inscrits</h2>
          {provenances.map(([nom, nb]) => (
            <div key={nom} className={s.etape}>
              <div className={s.etapeLigne}>
                <span>{nom}</span>
                <b>{nb}</b>
              </div>
              <div className={s.piste}>
                <span className={s.remplissage} style={{ width: `${(nb / maxProvenance) * 100}%` }} />
              </div>
            </div>
          ))}
          <p className={s.note}>« Inconnu » = inscrits avant l'ajout du suivi, ou arrivés sans lien suivi.</p>
        </div>

        {/* Liste des comptes */}
        <h2 className={s.section}>Comptes ({comptes.length})</h2>
        <div className={s.puces}>
          {FILTRES.map((f) => (
            <button key={f.cle} className={filtre === f.cle ? s.puceActive : s.puce} onClick={() => setFiltre(f.cle)}>
              {f.libelle}
            </button>
          ))}
        </div>
        <div className={s.puces}>
          <span className={s.muted}>Trier :</span>
          {TRIS.map((t) => (
            <button key={t.cle} className={tri === t.cle ? s.puceActive : s.puce} onClick={() => setTri(t.cle)}>
              {t.libelle}
            </button>
          ))}
        </div>

        <div className={s.liste}>
          {comptes.map((cpt) => (
            <button key={cpt.userId} className={s.compte} onClick={() => setOuvert(cpt)}>
              <div className={s.compteHaut}>
                <span className={s.compteNom}>{cpt.entreprise || cpt.nom || cpt.email}</span>
                <Badge c={cpt} />
              </div>
              {(cpt.entreprise || cpt.nom) && <span className={s.compteEmail}>{cpt.email}</span>}
              <span className={s.compteChiffres}>
                {cpt.nbDevis} devis · {cpt.nbSignes} signé{cpt.nbSignes > 1 ? "s" : ""} · {cpt.nbFactures} facture
                {cpt.nbFactures > 1 ? "s" : ""} · {euros(cpt.montantDevis)}
              </span>
              <span className={s.compteBas}>
                <span>Inscrit {date(cpt.inscritLe)}</span>
                <span>Actif {ilYA(cpt.derniereActivite)}</span>
              </span>
              <span className={s.indicateurs}>
                <Indicateur ok={cpt.nbDictees > 0} libelle="Dictée" />
                <Indicateur ok={cpt.logo} libelle="Logo" />
                <Indicateur ok={cpt.paiementEnLigne} libelle="Paiement" />
                <span className={s.provenance}>{cpt.provenance}</span>
              </span>
            </button>
          ))}
          {comptes.length === 0 && <p className={s.muted}>Aucun compte dans cette catégorie.</p>}
        </div>
      </div>

      {ouvert && <DetailCompte compte={ouvert} onFermer={() => setOuvert(null)} />}
    </main>
  );
}

function Tuile({ libelle, valeur, note }: { libelle: string; valeur: string; note?: string }) {
  return (
    <div className={s.tuile}>
      <p className={s.tuileLibelle}>{libelle}</p>
      <p className={s.tuileValeur}>{valeur}</p>
      {note && <p className={s.tuileNote}>{note}</p>}
    </div>
  );
}

function Indicateur({ ok, libelle }: { ok: boolean; libelle: string }) {
  return (
    <span className={ok ? s.indicOui : s.indicNon}>
      {ok ? "✓" : "✕"} {libelle}
    </span>
  );
}

function DetailCompte({ compte: c, onFermer }: { compte: Compte; onFermer: () => void }) {
  const [documents, setDocuments] = useState<Document[] | null>(null);

  useEffect(() => {
    if (!c.artisanId) {
      setDocuments([]);
      return;
    }
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const rep = await fetch(`/api/admin?compte=${encodeURIComponent(c.artisanId!)}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const j = rep.ok ? await rep.json() : { documents: [] };
      setDocuments(j.documents || []);
    })();
  }, [c.artisanId]);

  const tel = (c.telephone || "").replace(/\s/g, "");
  const whatsapp = tel.startsWith("0") ? `33${tel.slice(1)}` : tel.replace(/^\+/, "");

  const lignes: [string, string][] = [
    ["Email", c.email],
    ["Connexion", c.connexion === "google" ? "Google" : "Email + mot de passe"],
    ["Ville", c.ville || "—"],
    ["Inscrit le", dateHeure(c.inscritLe)],
    ["Dernière activité", `${dateHeure(c.derniereActivite)} (${ilYA(c.derniereActivite)})`],
    ["Dernière ouverture", dateHeure(c.derniereOuverture)],
    ["Provenance", c.provenanceDetail ? `${c.provenance} (${c.provenanceDetail})` : c.provenance],
    ["Profil rempli", c.profilRempli ? "Oui" : "Non"],
    ["1er document", dateHeure(c.premierDevisLe)],
    ["Dictées", c.nbDictees ? `${c.nbDictees} (1re le ${date(c.premiereDicteeLe)})` : "Aucune enregistrée"],
    ["Semaines actives", String(c.semainesActives)],
    ["Logo", c.logo ? "Oui" : "Non"],
    ["Paiement en ligne", c.paiementEnLigne ? "Configuré" : "Non"],
    ["Notifications", c.notifications ? "Activées" : "Non"],
    ["Montant des devis", euros(c.montantDevis)],
    ["Montant signé", euros(c.montantSigne)],
  ];

  return createPortal(
    <div className={s.fond} onClick={onFermer}>
      <div className={s.feuille} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={s.feuilleEntete}>
          <div>
            <p className={s.compteNom}>{c.entreprise || c.nom || c.email}</p>
            {c.entreprise && c.nom && <p className={s.compteEmail}>{c.nom}</p>}
          </div>
          <button className={s.fermer} onClick={onFermer} aria-label="Fermer">
            ✕
          </button>
        </div>
        <Badge c={c} />

        {tel && (
          <div className={s.contacts}>
            <a className="btn-ghost" href={`tel:${tel}`}>
              Appeler
            </a>
            <a className="btn-ghost" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </div>
        )}

        <dl className={s.details}>
          {lignes.map(([k, v]) => (
            <div key={k} className={s.detailLigne}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <h3 className={s.section}>Documents</h3>
        {documents === null ? (
          <p className={s.muted}>Chargement…</p>
        ) : documents.length === 0 ? (
          <p className={s.muted}>Aucun document.</p>
        ) : (
          <div className={s.docs}>
            {documents.map((d) => (
              <div key={d.id} className={s.doc}>
                <span>
                  <b>{d.est_facture ? d.numero_facture || "Facture" : d.numero_devis || "Devis"}</b>
                  <span className={s.muted}> · {date(d.created_at)}</span>
                </span>
                <span className={s.docDroite}>
                  {euros(d.total)}
                  <span className={s.docStatut}>
                    {d.avoir_numero
                      ? "Annulée"
                      : d.est_facture
                      ? d.payee_le
                        ? "Payée"
                        : "Facture"
                      : d.signe_le || d.statut === "signe"
                      ? "Signé"
                      : d.statut === "envoye"
                      ? "Envoyé"
                      : "Brouillon"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
