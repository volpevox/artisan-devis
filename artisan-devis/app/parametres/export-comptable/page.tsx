"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { useArtisanSession } from "@/lib/useArtisan";

type ClePeriode = "ce-mois" | "mois-dernier" | "ce-trimestre" | "cette-annee" | "personnalise";

const PERIODES: { cle: ClePeriode; libelle: string }[] = [
  { cle: "ce-mois", libelle: "Ce mois-ci" },
  { cle: "mois-dernier", libelle: "Mois dernier" },
  { cle: "ce-trimestre", libelle: "Ce trimestre" },
  { cle: "cette-annee", libelle: "Cette année" },
  { cle: "personnalise", libelle: "Dates au choix" },
];

interface LigneExport {
  numero: number | null;
  dateFacture: string | null;
  datePrestation: string | null;
  client: string;
  ht: number;
  tva: number;
  ttc: number;
  paye: boolean;
  datePaiement: string | null;
  moyenPaiement: string | null;
}

// Borne de début (00:00) et de fin (23:59:59) d'un jour, en heure locale.
function debutDuJour(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function finDuJour(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function bornesPeriode(cle: ClePeriode, dateDebut: string, dateFin: string): { debut: Date; fin: Date } | null {
  const maintenant = new Date();
  const a = maintenant.getFullYear();
  const m = maintenant.getMonth();

  if (cle === "ce-mois") return { debut: new Date(a, m, 1), fin: finDuJour(new Date(a, m + 1, 0)) };
  if (cle === "mois-dernier") return { debut: new Date(a, m - 1, 1), fin: finDuJour(new Date(a, m, 0)) };
  if (cle === "ce-trimestre") {
    const t = Math.floor(m / 3) * 3;
    return { debut: new Date(a, t, 1), fin: finDuJour(new Date(a, t + 3, 0)) };
  }
  if (cle === "cette-annee") return { debut: new Date(a, 0, 1), fin: finDuJour(new Date(a, 11, 31)) };

  // Personnalisé
  if (!dateDebut || !dateFin) return null;
  const [ad, md, jd] = dateDebut.split("-").map(Number);
  const [af, mf, jf] = dateFin.split("-").map(Number);
  const debut = new Date(ad, md - 1, jd);
  const fin = finDuJour(new Date(af, mf - 1, jf));
  if (debut > fin) return null;
  return { debut, fin };
}

function formaterDateFr(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR");
}

// Montant "1234.5" -> "1234,50" (format attendu par Excel en français).
function montantFr(n: number) {
  return n.toFixed(2).replace(".", ",");
}

// Champ texte protégé pour un CSV séparé par des points-virgules.
function champ(texte: string) {
  return `"${(texte || "").replace(/"/g, '""')}"`;
}

function construireCsv(lignes: LigneExport[], taux: number) {
  const entete = [
    "Numéro de facture",
    "Date de la facture",
    "Date de la prestation",
    "Client",
    "Total HT (€)",
    "Taux de TVA (%)",
    "Montant TVA (€)",
    "Total TTC (€)",
    "Statut",
    "Date de paiement",
    "Moyen de paiement",
  ].join(";");

  const corps = lignes.map((l) =>
    [
      l.numero ?? "",
      formaterDateFr(l.dateFacture),
      formaterDateFr(l.datePrestation),
      champ(l.client),
      montantFr(l.ht),
      String(taux).replace(".", ","),
      montantFr(l.tva),
      montantFr(l.ttc),
      l.paye ? "Payée" : "Impayée",
      formaterDateFr(l.datePaiement),
      champ(l.moyenPaiement || ""),
    ].join(";")
  );

  return [entete, ...corps].join("\r\n");
}

function nomFichier(debut: Date, fin: Date) {
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `factures-volpevox-${iso(debut)}_${iso(fin)}.csv`;
}

// Sur téléphone (surtout en PWA), le partage natif est le moyen le plus fiable
// de sortir un fichier de l'app ; sur ordinateur, on télécharge directement.
async function sortirFichier(contenu: string, nom: string) {
  // BOM UTF-8 en tête : sans lui, Excel (FR) affiche les accents en charabia.
  const blob = new Blob(["﻿" + contenu], { type: "text/csv;charset=utf-8;" });
  const fichier = new File([blob], nom, { type: "text/csv" });

  if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: nom });
      return;
    } catch {
      // Partage annulé par l'artisan : on retombe sur le téléchargement.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ExportComptable() {
  const { artisanId, profilArtisan, loading: chargementSession } = useArtisanSession();
  const taux = Number(profilArtisan?.taux_tva ?? 20);

  const [periode, setPeriode] = useState<ClePeriode>("mois-dernier");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState("");
  const [resultat, setResultat] = useState<{
    lignes: LigneExport[];
    debut: Date;
    fin: Date;
  } | null>(null);

  async function preparer() {
    setMessage("");
    setResultat(null);

    const bornes = bornesPeriode(periode, dateDebut, dateFin);
    if (!bornes) {
      setMessage("Choisis une date de début et une date de fin valides.");
      return;
    }
    if (!artisanId) return;

    setEnCours(true);

    const { data, error } = await supabase
      .from("devis")
      .select("numero_facture, facture_creee_le, date_prestation, client_nom, total, payee_le, moyen_paiement")
      .eq("artisan_id", artisanId)
      .eq("est_facture", true)
      .gte("facture_creee_le", debutDuJour(bornes.debut).toISOString())
      .lte("facture_creee_le", bornes.fin.toISOString())
      .order("facture_creee_le", { ascending: true });

    setEnCours(false);

    if (error) {
      setMessage("Erreur : " + error.message);
      return;
    }

    const lignes: LigneExport[] = (data || []).map((d) => {
      const ht = Number(d.total) || 0;
      const tva = (ht * taux) / 100;
      return {
        numero: d.numero_facture ?? null,
        dateFacture: d.facture_creee_le,
        datePrestation: d.date_prestation,
        client: d.client_nom || "",
        ht,
        tva,
        ttc: ht + tva,
        paye: Boolean(d.payee_le),
        datePaiement: d.payee_le,
        moyenPaiement: d.moyen_paiement,
      };
    });

    setResultat({ lignes, debut: bornes.debut, fin: bornes.fin });
  }

  function telecharger() {
    if (!resultat) return;
    const csv = construireCsv(resultat.lignes, taux);
    sortirFichier(csv, nomFichier(resultat.debut, resultat.fin));
  }

  if (chargementSession) {
    return (
      <main className="page-shell">
        <Topbar />
        <p className="message">Chargement...</p>
      </main>
    );
  }

  const totalHt = resultat?.lignes.reduce((s, l) => s + l.ht, 0) ?? 0;
  const totalTtc = resultat?.lignes.reduce((s, l) => s + l.ttc, 0) ?? 0;

  return (
    <main className="page-shell">
      <Topbar />

      <h1 className="page-title">Export comptable</h1>

      <div className="card">
        <p className="hint" style={{ margin: "0 0 14px" }}>
          Génère un fichier récapitulatif de tes factures sur une période, à transmettre à ton comptable ou à ouvrir
          dans Excel. Le fichier reprend le numéro, la date, le client et les montants (HT, TVA, TTC) de chaque facture.
        </p>

        <label className="field-label">Période</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6, marginBottom: periode === "personnalise" ? 12 : 0 }}>
          {PERIODES.map((p) => (
            <button
              key={p.cle}
              type="button"
              onClick={() => setPeriode(p.cle)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: `1px solid ${periode === p.cle ? "var(--ink)" : "var(--border)"}`,
                background: periode === p.cle ? "var(--ink)" : "transparent",
                color: periode === p.cle ? "#fff" : "var(--text)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {p.libelle}
            </button>
          ))}
        </div>

        {periode === "personnalise" && (
          <div className="field-row">
            <label className="field-label" style={{ flex: "1 1 0%", minWidth: 0, marginBottom: 0 }}>
              Du
              <input
                type="date"
                className="field"
                style={{ marginTop: 6, width: "100%" }}
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </label>
            <label className="field-label" style={{ flex: "1 1 0%", minWidth: 0, marginBottom: 0 }}>
              Au
              <input
                type="date"
                className="field"
                style={{ marginTop: 6, width: "100%" }}
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
              />
            </label>
          </div>
        )}

        <button className="btn btn-primary" onClick={preparer} disabled={enCours}>
          {enCours ? "Préparation..." : "Préparer l'export"}
        </button>

        {message && <p className="message">{message}</p>}
      </div>

      {resultat && (
        <div className="card">
          {resultat.lignes.length === 0 ? (
            <p className="hint" style={{ margin: 0 }}>
              Aucune facture émise sur cette période.
            </p>
          ) : (
            <>
              <p style={{ margin: "0 0 4px", fontWeight: 700, color: "var(--text)" }}>
                {resultat.lignes.length} facture{resultat.lignes.length > 1 ? "s" : ""} du{" "}
                {resultat.debut.toLocaleDateString("fr-FR")} au {resultat.fin.toLocaleDateString("fr-FR")}
              </p>
              <p className="hint" style={{ margin: "0 0 12px" }}>
                Total HT {montantFr(totalHt)} € · Total TTC {montantFr(totalTtc)} €
                {taux > 0 ? ` (TVA calculée à ${String(taux).replace(".", ",")} %)` : " (TVA non applicable)"}
              </p>

              <button className="btn btn-primary" onClick={telecharger}>
                Télécharger / partager le fichier
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}
