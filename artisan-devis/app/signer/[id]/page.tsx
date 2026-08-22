"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Signer() {
  const params = useParams();
  const devisId = params.id as string;

  const [devis, setDevis] = useState<any>(null);
  const [ligne, setLigne] = useState<any>(null);
  const [profil, setProfil] = useState<any>(null);
  const [chargement, setChargement] = useState(true);
  const [introuvable, setIntrouvable] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dessinRef = useRef(false);
  const aDessineRef = useRef(false);

  useEffect(() => {
    async function charger() {
      const { data: devisData } = await supabase.from("devis").select("*").eq("id", devisId).maybeSingle();

      if (!devisData) {
        setIntrouvable(true);
        setChargement(false);
        return;
      }

      const { data: ligneData } = await supabase
        .from("lignes_devis")
        .select("*")
        .eq("devis_id", devisId)
        .limit(1)
        .maybeSingle();

      const { data: profilData } = await supabase.from("artisans").select("*").limit(1).maybeSingle();

      setDevis(devisData);
      setLigne(ligneData);
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
      body: JSON.stringify({ devisId, signatureDataUrl }),
    });
    const data = await res.json();

    if (data.erreur) {
      setMessage("Erreur : " + data.erreur);
      setEnregistrement(false);
      return;
    }

    setDevis((prev: any) => ({ ...prev, statut: "signe", signe_le: new Date().toISOString() }));
    setMessage("Devis signé, merci !");
  }

  if (chargement) {
    return <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>Chargement...</main>;
  }

  if (introuvable) {
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <p>Devis introuvable.</p>
      </main>
    );
  }

  const total = ligne?.total_ligne ?? devis.total;

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 480, margin: "0 auto" }}>
      {profil?.nom_entreprise && <h2 style={{ marginBottom: 4 }}>{profil.nom_entreprise}</h2>}
      <h1 style={{ fontSize: 22, marginTop: 0 }}>Devis pour {devis.client_nom}</h1>

      {ligne && (
        <div style={{ background: "#f4f5f7", padding: 14, borderRadius: 6, marginBottom: 16 }}>
          <p style={{ margin: "0 0 6px" }}>{ligne.description}</p>
          <p style={{ margin: 0, fontSize: 14, color: "#555" }}>
            {ligne.quantite} × {ligne.prix_unitaire} €
          </p>
        </div>
      )}

      <p style={{ fontWeight: "bold", fontSize: 18 }}>Total : {total} €</p>

      {devis.statut === "signe" ? (
        <div style={{ background: "#e6f4ea", padding: 16, borderRadius: 6, marginTop: 20 }}>
          <p style={{ margin: 0 }}>
            ✓ Devis signé le {new Date(devis.signe_le).toLocaleDateString("fr-FR")}
          </p>
        </div>
      ) : (
        <>
          <p style={{ marginTop: 24, marginBottom: 8 }}>Signez ci-dessous avec votre doigt ou votre souris :</p>
          <canvas
            ref={canvasRef}
            width={400}
            height={180}
            style={{ border: "1px solid #ccc", borderRadius: 6, touchAction: "none", width: "100%", maxWidth: 400 }}
            onPointerDown={debuterTrait}
            onPointerMove={tracer}
            onPointerUp={terminerTrait}
            onPointerLeave={terminerTrait}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button onClick={effacer} style={{ padding: "8px 16px" }}>
              Effacer
            </button>
            <button
              onClick={valider}
              disabled={enregistrement}
              style={{
                padding: "8px 20px",
                background: "green",
                color: "white",
                border: "none",
                borderRadius: 6,
              }}
            >
              Bon pour accord — Valider
            </button>
          </div>
          <p>{message}</p>
        </>
      )}
    </main>
  );
}
