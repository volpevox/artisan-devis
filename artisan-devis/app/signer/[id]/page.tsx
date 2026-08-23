"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

export default function Signer() {
  const params = useParams();
  const devisId = params.id as string;

  const [devis, setDevis] = useState<any>(null);
  const [lignes, setLignes] = useState<any[]>([]);
  const [profil, setProfil] = useState<any>(null);
  const [chargement, setChargement] = useState(true);
  const [introuvable, setIntrouvable] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState("");
  const [lieuSignature, setLieuSignature] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dessinRef = useRef(false);
  const aDessineRef = useRef(false);

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

  function position(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
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
  }

  async function valider() {
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
    }));
    setMessage("Devis signé, merci !");
  }

  if (chargement) {
    return (
      <main className="page-shell">
        <p className="message">Chargement...</p>
      </main>
    );
  }

  if (introuvable) {
    return (
      <main className="page-shell">
        <p className="message">Document introuvable.</p>
      </main>
    );
  }

  const totalHT = devis.total;
  const tauxTva = profil?.taux_tva ?? 20;
  const montantTva = (totalHT * tauxTva) / 100;
  const totalTTC = totalHT + montantTva;
  const estFacture = Boolean(devis.est_facture);
  const motDocument = estFacture ? "Facture" : "Devis";
  const numero = estFacture ? devis.numero_facture : devis.numero_devis;

  return (
    <main className="page-shell">
      <div className="card">
        {profil?.nom_entreprise && (
          <h2 style={{ marginTop: 0, marginBottom: 4, fontSize: 15, color: "var(--ink)" }}>
            {profil.nom_entreprise}
          </h2>
        )}
        <h1 className="page-title" style={{ marginBottom: devis.client_adresse ? 4 : 16 }}>
          {motDocument}
          {numero ? ` n°${numero}` : ""} pour {devis.client_nom}
        </h1>
        {devis.client_adresse && (
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--muted)" }}>{devis.client_adresse}</p>
        )}

        {lignes.map((ligne) => (
          <div key={ligne.id} style={{ background: "var(--bg)", padding: 14, borderRadius: 8, marginBottom: 10 }}>
            <p style={{ margin: "0 0 6px" }}>{ligne.description}</p>
            <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>
              {ligne.quantite} {ligne.unite} × {ligne.prix_unitaire} €
            </p>
          </div>
        ))}

        <div style={{ margin: "10px 0 16px" }}>
          <p style={{ display: "flex", justifyContent: "space-between", margin: "0 0 4px", fontSize: 13, color: "var(--muted)" }}>
            <span>Total HT</span>
            <span>{totalHT.toFixed(2)} €</span>
          </p>
          {tauxTva > 0 ? (
            <p style={{ display: "flex", justifyContent: "space-between", margin: "0 0 4px", fontSize: 13, color: "var(--muted)" }}>
              <span>TVA ({tauxTva}%)</span>
              <span>{montantTva.toFixed(2)} €</span>
            </p>
          ) : (
            <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--muted)" }}>TVA non applicable, art. 293 B du CGI</p>
          )}
          <p className="total-line" style={{ display: "flex", justifyContent: "space-between", fontSize: 18 }}>
            <span>Total TTC</span>
            <span>{totalTTC.toFixed(2)} €</span>
          </p>
        </div>

        {devis.statut === "signe" ? (
          <div
            style={{
              background: "var(--success-bg)",
              padding: 16,
              borderRadius: 8,
              marginTop: 8,
            }}
          >
            <p style={{ margin: "0 0 10px", color: "var(--success)" }}>
              ✓ {motDocument} signé{estFacture ? "e" : ""} le {new Date(devis.signe_le).toLocaleDateString("fr-FR")}
            </p>
            {devis.signature_url && (
              <img
                src={devis.signature_url}
                alt="Signature"
                style={{
                  maxWidth: 220,
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  marginBottom: 10,
                }}
              />
            )}
            <a href={`/api/devis-pdf/${devisId}?t=${Date.now()}`} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
              {estFacture ? "Télécharger la facture" : "Télécharger le PDF signé"}
            </a>
          </div>
        ) : (
          <>
            <input
              className="field"
              placeholder="Votre ville (pour « Fait à ... »)"
              value={lieuSignature}
              onChange={(e) => setLieuSignature(e.target.value)}
            />
            <p style={{ marginTop: 8, marginBottom: 8 }}>Signez ci-dessous avec votre doigt ou votre souris :</p>
            <canvas
              ref={canvasRef}
              width={400}
              height={180}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 8,
                touchAction: "none",
                width: "100%",
                maxWidth: 400,
                background: "#fff",
              }}
              onPointerDown={debuterTrait}
              onPointerMove={tracer}
              onPointerUp={terminerTrait}
              onPointerLeave={terminerTrait}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button className="btn btn-outline" onClick={effacer}>
                Effacer
              </button>
              <button className="btn btn-success" onClick={valider} disabled={enregistrement}>
                Bon pour accord — Valider
              </button>
            </div>
            {message && <p className="message">{message}</p>}
          </>
        )}
      </div>
    </main>
  );
}
