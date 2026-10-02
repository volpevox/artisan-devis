"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { MOYENS_PAIEMENT, formaterIban, moyensAcceptes } from "@/lib/moyensPaiement";
import { resteAPayer } from "@/lib/acompte";

function euros(n: number) {
  return `${(Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ /g, " ")} €`;
}

// Page publique ouverte par le CLIENT de l'artisan (lien du mail) : signer un
// devis ou regler une facture. Toujours en theme clair, dans le meme style
// que les mails et les PDF (bandeau bleu au nom de l'artisan, ticket, bouton
// or) -- le client ne doit pas avoir l'impression de changer de site.
const C = {
  bleu: "#0b2a5b",
  or: "#d4af37",
  fond: "#f4f6f8",
  texte: "#1c2230",
  gris: "#6b7686",
  bord: "#e2e6ee",
  ticket: "#f8f6ef",
  ticketBord: "#ece4c8",
  vert: "#1a7a4a",
  vertFond: "#e8f6ee",
  rouge: "#b3261e",
};

export default function Signer() {
  return (
    <Suspense fallback={null}>
      <SignerContenu />
    </Suspense>
  );
}

function SignerContenu() {
  const params = useParams();
  const searchParams = useSearchParams();
  const devisId = params.id as string;

  const [devis, setDevis] = useState<any>(null);
  const [lignes, setLignes] = useState<any[]>([]);
  const [profil, setProfil] = useState<any>(null);
  const [chargement, setChargement] = useState(true);
  const [introuvable, setIntrouvable] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState("");
  const [lieuSignature, setLieuSignature] = useState("");
  const [enCoursPaiement, setEnCoursPaiement] = useState(false);
  const [aSigne, setASigne] = useState(false);
  const [ibanCopie, setIbanCopie] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dessinRef = useRef(false);
  const aDessineRef = useRef(false);

  // Le fond global de l'appli est sombre : on passe la page en clair (y
  // compris le rebond du defilement sur iPhone).
  useEffect(() => {
    const avant = document.body.style.background;
    document.body.style.background = C.fond;
    return () => {
      document.body.style.background = avant;
    };
  }, []);

  useEffect(() => {
    async function charger() {
      const res = await fetch(`/api/devis-public/${devisId}`);

      if (!res.ok) {
        setIntrouvable(true);
        setChargement(false);
        return;
      }

      const { devis: devisData, lignes: lignesData, profil: profilData } = await res.json();

      setDevis(devisData);
      setLignes(lignesData || []);
      setProfil(profilData);
      setChargement(false);
    }
    charger();
  }, [devisId]);

  useEffect(() => {
    if (searchParams.get("paiement") !== "succes") return;
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return;

    async function confirmer() {
      setMessage("Confirmation du paiement...");
      const res = await fetch("/api/confirmer-paiement-facture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devisId, sessionId }),
      });
      const data = await res.json();

      if (data.erreur) {
        setMessage("Erreur : " + data.erreur);
        return;
      }

      setDevis((prev: any) =>
        data.acompte
          ? { ...prev, acompte_payee_le: data.payee_le, acompte_moyen_paiement: data.moyen_paiement }
          : { ...prev, payee_le: data.payee_le, moyen_paiement: data.moyen_paiement }
      );
      setMessage("");
    }
    confirmer();
  }, [searchParams, devisId]);

  // acompte : payer la facture d'acompte du devis signe (sinon la facture).
  async function payer(acompte = false) {
    setEnCoursPaiement(true);
    setMessage("");

    try {
      const res = await fetch(`/api/payer-facture/${devisId}${acompte ? "?acompte=1" : ""}`, { method: "POST" });
      const data = await res.json();

      if (data.erreur || !data.url) {
        setMessage("Erreur : " + (data.erreur || "Impossible de démarrer le paiement"));
        setEnCoursPaiement(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setMessage("Erreur : impossible de contacter le serveur, réessayez.");
      setEnCoursPaiement(false);
    }
  }

  // Le cadre est affiche a la largeur de l'ecran (plus petit que ses 400 px
  // internes sur un telephone) : on ramene la position du doigt a l'echelle
  // du dessin, sinon le trait se decale par rapport au doigt.
  function position(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  }

  function debuterTrait(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = position(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    dessinRef.current = true;
    aDessineRef.current = true;
    setASigne(true);
  }

  function tracer(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dessinRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = position(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#103362";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function terminerTrait() {
    dessinRef.current = false;
  }

  function effacer() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    aDessineRef.current = false;
    setASigne(false);
  }

  async function valider() {
    if (!lieuSignature.trim()) {
      setMessage("Merci d'indiquer votre ville avant de signer.");
      return;
    }

    if (!aDessineRef.current) {
      setMessage("Merci de signer avant de valider.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setEnregistrement(true);
    setMessage("Enregistrement de la signature...");

    const signatureDataUrl = canvas.toDataURL("image/png");

    const res = await fetch("/api/upload-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ devisId, signatureDataUrl, lieuSignature: lieuSignature.trim() }),
    });
    const data = await res.json();

    if (data.erreur) {
      setMessage("Erreur : " + data.erreur);
      setEnregistrement(false);
      return;
    }

    setDevis((prev: any) => ({
      ...prev,
      statut: "signe",
      signe_le: new Date().toISOString(),
      lieu_signature: lieuSignature.trim(),
      signature_url: data.url,
      // Facture d'acompte creee a la signature : « Payer l'acompte » s'affiche.
      ...(data.acompte || {}),
    }));
    setMessage("");
  }

  async function copierIban(iban: string) {
    try {
      await navigator.clipboard.writeText(iban.replace(/\s+/g, ""));
      setIbanCopie(true);
      setTimeout(() => setIbanCopie(false), 2000);
    } catch {
      // presse-papiers indisponible : l'IBAN reste selectionnable a la main
    }
  }

  if (chargement || introuvable) {
    return (
      <Fond>
        <p style={{ textAlign: "center", color: C.gris, marginTop: 60 }}>
          {chargement ? "Chargement..." : "Document introuvable."}
        </p>
      </Fond>
    );
  }

  const totalHT = Number(devis.total) || 0;
  const tauxTva = Number(profil?.taux_tva ?? 20);
  const montantTva = (totalHT * tauxTva) / 100;
  const totalTTC = totalHT + montantTva;
  const estFacture = Boolean(devis.est_facture);
  const motDocument = estFacture ? "Facture" : "Devis";
  const numero = estFacture ? devis.numero_facture : devis.numero_devis;
  const nomArtisan = profil?.nom_affiche || profil?.nom_entreprise || "";
  // Meme regle que le mail (/api/facture/[id]) : le paiement en ligne est
  // propose des que l'artisan l'a active, quel que soit le mode choisi a la
  // creation -- c'est le client qui choisit comment regler.
  const paiementEnLigneActif = Boolean(profil?.stripe_paiement_actif);
  const lienPdf = `/api/devis-pdf/${devisId}?t=${Date.now()}`;
  const iban = formaterIban(profil?.iban);
  const bic = String(profil?.bic || "").replace(/\s+/g, "").toUpperCase();
  const titulaire = String(profil?.titulaire_compte || profil?.nom_complet || "").trim();
  const moyens = moyensAcceptes(profil?.moyens_paiement);
  const autresMoyens = MOYENS_PAIEMENT.filter((m) => m.valeur !== "virement" && moyens.includes(m.valeur)).map(
    (m) => m.libelle
  );
  const jour = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");
  // Facture d'acompte (supabase/acompte.sql) : payee a part sur le devis
  // signe, puis deduite de la facture finale.
  const aAcompte = Boolean(devis.acompte_numero);
  const montantAcompte = Number(devis.acompte_montant) || 0;
  const reste = resteAPayer(devis, tauxTva);

  // Bouton « Payer en ligne » + autres moyens (virement, cheque, especes).
  const blocPaiement = (montant: number, acompte: boolean, reference: string) => (
    <>
      {paiementEnLigneActif && (
        <>
          <button onClick={() => payer(acompte)} disabled={enCoursPaiement} style={{ ...boutonOr, marginTop: 18 }}>
            {enCoursPaiement ? "Ouverture du paiement..." : `Payer ${acompte ? "l'acompte de " : ""}${euros(montant)} en ligne`}
          </button>
          <div style={{ textAlign: "center", fontSize: 12, color: C.gris, marginTop: 6 }}>
            Carte bancaire, Apple Pay ou Google Pay · paiement sécurisé
          </div>
        </>
      )}
      <div style={{ marginTop: paiementEnLigneActif ? 24 : 16, fontSize: 14, lineHeight: 1.6, color: C.texte }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          {paiementEnLigneActif
            ? "Vous préférez un autre moyen ?"
            : acompte
            ? "Pour régler l'acompte :"
            : "Pour régler cette facture :"}
        </div>
        {moyens.includes("virement") && iban && (
          <div style={{ marginBottom: 10 }}>
            <strong>Virement bancaire</strong>
            {titulaire && <div style={{ fontSize: 13, color: C.gris }}>Titulaire : {titulaire}</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "Consolas, Menlo, monospace", fontSize: 13, userSelect: "all" }}>{iban}</span>
              <button onClick={() => copierIban(iban)} style={boutonPetit}>
                {ibanCopie ? "Copié ✓" : "Copier l'IBAN"}
              </button>
            </div>
            {bic && <div style={{ fontSize: 13, color: C.gris }}>BIC : {bic}</div>}
            <div style={{ fontSize: 13, color: C.gris }}>Référence à indiquer : {reference}</div>
          </div>
        )}
        {(autresMoyens.length > 0 || (moyens.includes("virement") && !iban) || moyens.length === 0) && (
        <div>
          <strong>
            {autresMoyens.length > 0
              ? autresMoyens.join(" ou ")
              : moyens.includes("virement") && !iban
              ? "Virement"
              : "Règlement"}
          </strong>{" "}
          : à convenir directement avec {profil?.nom_complet || nomArtisan || "l'artisan"}
          {profil?.telephone ? (
            <>
              {" "}
              au{" "}
              <a href={`tel:${String(profil.telephone).replace(/\s+/g, "")}`} style={{ ...lienStyle, whiteSpace: "nowrap" }}>
                {profil.telephone}
              </a>
            </>
          ) : null}
          .
        </div>
        )}
      </div>
    </>
  );

  return (
    <Fond>
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 14,
          overflow: "hidden",
          border: `1px solid ${C.bord}`,
          boxShadow: "0 4px 18px rgba(11,42,91,0.06)",
        }}
      >
        {/* Bandeau : l'artisan en vedette */}
        <div style={{ background: C.bleu, padding: "18px 22px", borderBottom: `3px solid ${C.or}` }}>
          {nomArtisan && (
            <div style={{ color: "#fff", fontSize: 19, fontWeight: 800, fontFamily: "var(--font-poppins), Arial, sans-serif" }}>
              {nomArtisan}
            </div>
          )}
          <div style={{ color: C.or, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginTop: 3 }}>
            {motDocument}
            {numero ? ` n°${numero}` : ""}
            {devis.client_nom ? ` · ${devis.client_nom}` : ""}
          </div>
        </div>

        <div style={{ padding: 22 }}>
          {/* Ticket : lignes et totaux */}
          <div style={{ background: C.ticket, border: `1px solid ${C.ticketBord}`, borderRadius: 10, padding: "14px 16px" }}>
            {lignes.map((ligne) => {
              const q = Number(ligne.quantite) || 1;
              const pu = Number(ligne.prix_unitaire) || 0;
              const detail = quantiteLisible(q, ligne.unite || "forfait");
              return (
                <div key={ligne.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0" }}>
                  <div style={{ fontSize: 14, color: C.texte }}>
                    {ligne.description || "Prestation"}
                    {detail && (
                      <div style={{ fontSize: 12, color: C.gris }}>
                        {detail} × {euros(pu)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: C.texte, whiteSpace: "nowrap" }}>{euros(q * pu)}</div>
                </div>
              );
            })}
            <div style={{ borderTop: "1px dashed #cdbf8f", margin: "10px 0 8px" }} />
            {tauxTva > 0 ? (
              <>
                <LigneTotal libelle="Total HT" montant={euros(totalHT)} />
                <LigneTotal libelle={`TVA ${String(tauxTva).replace(".", ",")} %`} montant={euros(montantTva)} />
              </>
            ) : (
              <div style={{ fontSize: 12, color: C.gris, marginBottom: 2 }}>TVA non applicable, art. 293 B du CGI</div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.texte }}>{tauxTva > 0 ? "Total TTC" : "Total"}</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: C.bleu, fontFamily: "var(--font-roboto), Arial, sans-serif" }}>
                {euros(totalTTC)}
              </span>
            </div>
            {estFacture && aAcompte && !devis.avoir_numero && (
              <>
                <LigneTotal libelle={`Acompte déjà facturé (n°${devis.acompte_numero})`} montant={`-${euros(montantAcompte)}`} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.texte }}>Reste à payer</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: C.bleu, fontFamily: "var(--font-roboto), Arial, sans-serif" }}>
                    {euros(reste)}
                  </span>
                </div>
              </>
            )}
            {estFacture && profil?.conditions_paiement && !devis.payee_le && (
              <div style={{ fontSize: 12, color: C.gris, marginTop: 6 }}>Conditions : {profil.conditions_paiement}</div>
            )}
          </div>

          <div style={{ textAlign: "center", margin: "12px 0 4px" }}>
            <a href={estFacture && devis.avoir_numero ? `${lienPdf}&avoir=1` : lienPdf} target="_blank" rel="noreferrer" style={lienStyle}>
              📄{" "}
              {estFacture
                ? devis.avoir_numero
                  ? "Télécharger l'avoir"
                  : "Voir la facture (PDF)"
                : devis.statut === "signe"
                ? "Télécharger le devis signé (PDF)"
                : "Voir le devis complet (PDF)"}
            </a>
          </div>

          {estFacture ? (
            devis.avoir_numero ? (
              <Encadre>Cette facture a été annulée (avoir AV-{devis.avoir_numero}).</Encadre>
            ) : devis.payee_le ? (
              <Encadre vert>
                ✓ Facture réglée le {jour(devis.payee_le)}
                {devis.moyen_paiement ? ` (${devis.moyen_paiement})` : ""}. Merci !
              </Encadre>
            ) : aAcompte && !devis.acompte_payee_le ? (
              // Devis passe en facture avant le reglement de l'acompte : le
              // client regle d'abord l'acompte (facture a part), puis le reste.
              <>
                <div style={{ marginTop: 18, fontSize: 16, fontWeight: 800, color: C.bleu }}>
                  1. Acompte à régler : {euros(montantAcompte)}
                </div>
                <a href={`/api/devis-pdf/${devisId}?acompte=1&t=${Date.now()}`} target="_blank" rel="noreferrer" style={lienStyle}>
                  📄 Voir la facture d&apos;acompte n°{devis.acompte_numero} (PDF)
                </a>
                {blocPaiement(montantAcompte, true, `Facture d'acompte n°${devis.acompte_numero}`)}
                <div style={{ marginTop: 28, fontSize: 16, fontWeight: 800, color: C.bleu }}>
                  2. Puis le reste : {euros(reste)}
                </div>
                {blocPaiement(reste, false, numero ? `Facture n°${numero}` : "votre nom")}
              </>
            ) : (
              blocPaiement(reste, false, numero ? `Facture n°${numero}` : "votre nom")
            )
          ) : devis.statut === "signe" ? (
            <>
            <Encadre vert>
              <div>
                ✓ Devis signé le {devis.signe_le ? jour(devis.signe_le) : ""}
                {devis.lieu_signature ? ` à ${devis.lieu_signature}` : ""}. Merci !
              </div>
              {devis.signature_url && (
                <img
                  src={devis.signature_url}
                  alt="Signature"
                  style={{ maxWidth: 200, background: "#fff", border: `1px solid ${C.bord}`, borderRadius: 6, marginTop: 10 }}
                />
              )}
              {!aAcompte && (
                <div style={{ fontSize: 13, color: C.gris, marginTop: 8 }}>
                  {nomArtisan || "L'artisan"} est prévenu et reviendra vers vous.
                </div>
              )}
            </Encadre>
            {aAcompte && (
              <div style={{ marginTop: 22 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.bleu }}>
                  Acompte : {euros(montantAcompte)}
                </div>
                <div style={{ fontSize: 13, color: C.gris, margin: "2px 0 6px" }}>
                  Facture d&apos;acompte n°{devis.acompte_numero}
                  {devis.acompte_pourcentage ? ` (${String(devis.acompte_pourcentage).replace(".", ",")} % du devis)` : ""}. Le
                  solde sera facturé à la fin de la prestation.
                </div>
                <a href={`/api/devis-pdf/${devisId}?acompte=1&t=${Date.now()}`} target="_blank" rel="noreferrer" style={lienStyle}>
                  📄 Voir la facture d&apos;acompte (PDF)
                </a>
                {devis.acompte_payee_le ? (
                  <Encadre vert>
                    ✓ Acompte réglé le {jour(devis.acompte_payee_le)}
                    {devis.acompte_moyen_paiement ? ` (${devis.acompte_moyen_paiement})` : ""}. Merci !
                  </Encadre>
                ) : (
                  blocPaiement(montantAcompte, true, `Facture d'acompte n°${devis.acompte_numero}`)
                )}
              </div>
            )}
            </>
          ) : (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.bleu, marginBottom: 4 }}>Signer le devis</div>
              <div style={{ fontSize: 13, color: C.gris, marginBottom: 12 }}>
                En signant, vous donnez votre accord (« Bon pour accord ») sur ce devis.
              </div>
              <label style={{ fontSize: 13, fontWeight: 700, color: C.texte }}>Fait à (votre ville)</label>
              <input
                value={lieuSignature}
                onChange={(e) => setLieuSignature(e.target.value)}
                placeholder="Ex. : Lyon"
                autoComplete="address-level2"
                style={{
                  display: "block",
                  width: "100%",
                  boxSizing: "border-box",
                  margin: "4px 0 14px",
                  padding: "12px 14px",
                  fontSize: 16,
                  border: `1px solid ${C.bord}`,
                  borderRadius: 10,
                  background: "#fff",
                  color: C.texte,
                }}
              />
              <label style={{ fontSize: 13, fontWeight: 700, color: C.texte }}>Votre signature</label>
              <div style={{ position: "relative", marginTop: 4 }}>
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={180}
                  style={{
                    display: "block",
                    border: `2px dashed ${aSigne ? C.bleu : "#c5ccd8"}`,
                    borderRadius: 10,
                    touchAction: "none",
                    width: "100%",
                    height: "auto",
                    aspectRatio: "400 / 180",
                    background: "#fff",
                  }}
                  onPointerDown={debuterTrait}
                  onPointerMove={tracer}
                  onPointerUp={terminerTrait}
                  onPointerLeave={terminerTrait}
                />
                {!aSigne && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#a9b2c0",
                      fontSize: 15,
                      pointerEvents: "none",
                    }}
                  >
                    ✍️ Signez ici avec le doigt
                  </div>
                )}
              </div>
              {aSigne && (
                <div style={{ textAlign: "right", marginTop: 6 }}>
                  <button onClick={effacer} style={boutonPetit}>
                    Effacer et recommencer
                  </button>
                </div>
              )}
              <button onClick={valider} disabled={enregistrement} style={{ ...boutonOr, marginTop: 16 }}>
                {enregistrement ? "Enregistrement..." : "Bon pour accord — Signer"}
              </button>
              <div style={{ textAlign: "center", fontSize: 12, color: C.gris, marginTop: 6 }}>
                Signature électronique sécurisée, sans imprimer
              </div>
            </div>
          )}

          {message && (
            <p style={{ marginTop: 14, textAlign: "center", fontSize: 14, color: message.startsWith("Erreur") || message.startsWith("Merci d") ? C.rouge : C.gris }}>
              {message}
            </p>
          )}
        </div>

        <div style={{ background: C.fond, padding: 12, textAlign: "center", fontSize: 11, color: "#93a0b3" }}>
          Envoyé avec VolpeVox
        </div>
      </div>
    </Fond>
  );
}

// "2 heures", "4,5 m²", "3 jours"... ; rien pour un forfait unique.
function quantiteLisible(q: number, unite: string) {
  const n = q.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  const pluriel = q >= 2;
  switch (unite) {
    case "heure":
      return `${n} heure${pluriel ? "s" : ""}`;
    case "jour":
      return `${n} jour${pluriel ? "s" : ""}`;
    case "unité":
      return `${n} unité${pluriel ? "s" : ""}`;
    case "m²":
    case "ml":
      return `${n} ${unite}`;
    default:
      return q !== 1 ? `${n} forfaits` : "";
  }
}

function Fond({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: C.fond,
        padding: "20px 14px 40px",
        boxSizing: "border-box",
        color: C.texte,
        fontFamily: "var(--font-montserrat), Arial, sans-serif",
      }}
    >
      {children}
    </main>
  );
}

function LigneTotal({ libelle, montant }: { libelle: string; montant: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#56606e", padding: "2px 0" }}>
      <span>{libelle}</span>
      <span>{montant}</span>
    </div>
  );
}

function Encadre({ children, vert }: { children: React.ReactNode; vert?: boolean }) {
  return (
    <div
      style={{
        marginTop: 18,
        padding: 16,
        borderRadius: 10,
        background: vert ? C.vertFond : C.fond,
        color: vert ? C.vert : C.gris,
        fontSize: 15,
        fontWeight: vert ? 700 : 400,
      }}
    >
      {children}
    </div>
  );
}

const boutonOr: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "16px 12px",
  background: C.or,
  color: C.bleu,
  border: "none",
  borderRadius: 12,
  fontSize: 17,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "var(--font-poppins), Arial, sans-serif",
};

const boutonPetit: React.CSSProperties = {
  padding: "4px 10px",
  background: "#fff",
  color: C.bleu,
  border: `1px solid ${C.bord}`,
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const lienStyle: React.CSSProperties = { color: C.bleu, fontWeight: 700, fontSize: 14 };
