"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function Profil() {
  const [artisanId, setArtisanId] = useState<string | null>(null);
  const [nomEntreprise, setNomEntreprise] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFichier, setLogoFichier] = useState<File | null>(null);
  const [tauxTva, setTauxTva] = useState("20");
  const [siret, setSiret] = useState("");
  const [numeroTva, setNumeroTva] = useState("");
  const [iban, setIban] = useState("");
  const [conditionsPaiement, setConditionsPaiement] = useState("");
  const [mentionsLegales, setMentionsLegales] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function charger() {
      const { data } = await supabase.from("artisans").select("*").limit(1).maybeSingle();
      if (data) {
        setArtisanId(data.id);
        setNomEntreprise(data.nom_entreprise || "");
        setTelephone(data.telephone || "");
        setAdresse(data.adresse || "");
        setLogoUrl(data.logo_url || "");
        setTauxTva(data.taux_tva !== null && data.taux_tva !== undefined ? String(data.taux_tva) : "20");
        setSiret(data.siret || "");
        setNumeroTva(data.numero_tva || "");
        setIban(data.iban || "");
        setConditionsPaiement(data.conditions_paiement || "");
        setMentionsLegales(data.mentions_legales || "");
      }
      setChargement(false);
    }
    charger();
  }, []);

  async function enregistrer() {
    setMessage("Enregistrement...");

    let urlLogo = logoUrl;

    if (logoFichier) {
      const formData = new FormData();
      formData.append("logo", logoFichier);

      const res = await fetch("/api/upload-logo", { method: "POST", body: formData });
      const data = await res.json();

      if (data.erreur) {
        setMessage("Erreur upload logo : " + data.erreur);
        return;
      }

      urlLogo = data.url;
      setLogoUrl(urlLogo);
    }

    const infos = {
      nom_entreprise: nomEntreprise,
      telephone,
      adresse,
      logo_url: urlLogo,
      taux_tva: Number(tauxTva) || 0,
      siret,
      numero_tva: numeroTva,
      iban,
      conditions_paiement: conditionsPaiement,
      mentions_legales: mentionsLegales,
    };

    if (artisanId) {
      const { error } = await supabase.from("artisans").update(infos).eq("id", artisanId);
      if (error) {
        setMessage("Erreur : " + error.message);
        return;
      }
    } else {
      const { data, error } = await supabase.from("artisans").insert(infos).select().single();
      if (error) {
        setMessage("Erreur : " + error.message);
        return;
      }
      setArtisanId(data.id);
    }

    setMessage("Profil enregistré !");
  }

  if (chargement) {
    return <main style={{ padding: "2rem" }}>Chargement...</main>;
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 400 }}>
      <Link href="/" style={{ display: "block", marginBottom: 15 }}>
        ← Retour au devis
      </Link>

      <h1>Mon profil</h1>

      {logoUrl && (
        <img
          src={logoUrl}
          alt="Logo actuel"
          style={{ maxWidth: 150, maxHeight: 150, display: "block", marginBottom: 10 }}
        />
      )}

      <label style={{ display: "block", marginBottom: 10 }}>
        Logo :
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setLogoFichier(e.target.files?.[0] || null)}
          style={{ display: "block", marginTop: 4 }}
        />
      </label>

      <input
        placeholder="Nom de l'entreprise"
        value={nomEntreprise}
        onChange={(e) => setNomEntreprise(e.target.value)}
        style={{ display: "block", marginBottom: 10, width: "100%", padding: 8 }}
      />
      <input
        placeholder="Téléphone"
        value={telephone}
        onChange={(e) => setTelephone(e.target.value)}
        style={{ display: "block", marginBottom: 10, width: "100%", padding: 8 }}
      />
      <input
        placeholder="Adresse"
        value={adresse}
        onChange={(e) => setAdresse(e.target.value)}
        style={{ display: "block", marginBottom: 10, width: "100%", padding: 8 }}
      />

      <h2 style={{ fontSize: 16, marginTop: 20, marginBottom: 10 }}>Informations légales</h2>

      <input
        placeholder="SIRET"
        value={siret}
        onChange={(e) => setSiret(e.target.value)}
        style={{ display: "block", marginBottom: 10, width: "100%", padding: 8 }}
      />
      <label style={{ display: "block", marginBottom: 10 }}>
        Taux de TVA (%) — mets 0 si tu es en franchise en base de TVA (auto-entrepreneur)
        <input
          placeholder="Taux de TVA (%)"
          value={tauxTva}
          onChange={(e) => setTauxTva(e.target.value)}
          style={{ display: "block", marginTop: 4, width: "100%", padding: 8 }}
        />
      </label>
      <input
        placeholder="N° TVA intracommunautaire (si assujetti à la TVA)"
        value={numeroTva}
        onChange={(e) => setNumeroTva(e.target.value)}
        style={{ display: "block", marginBottom: 10, width: "100%", padding: 8 }}
      />
      <input
        placeholder="IBAN (pour le RIB, facultatif)"
        value={iban}
        onChange={(e) => setIban(e.target.value)}
        style={{ display: "block", marginBottom: 10, width: "100%", padding: 8 }}
      />
      <textarea
        placeholder="Conditions de paiement (ex: Acompte 30% à la commande, solde à la livraison)"
        value={conditionsPaiement}
        onChange={(e) => setConditionsPaiement(e.target.value)}
        style={{ display: "block", marginBottom: 10, width: "100%", padding: 8 }}
      />
      <textarea
        placeholder="Mentions légales / assurance (ex: Assurance RC Pro n°..., Garantie décennale...)"
        value={mentionsLegales}
        onChange={(e) => setMentionsLegales(e.target.value)}
        style={{ display: "block", marginBottom: 10, width: "100%", padding: 8 }}
      />

      <button onClick={enregistrer} style={{ padding: "10px 20px" }}>
        Enregistrer
      </button>

      <p>{message}</p>
    </main>
  );
}
