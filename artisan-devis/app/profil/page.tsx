"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { useArtisanSession } from "@/lib/useArtisan";

export default function Profil() {
  const { session, artisanId, loading: chargementSession } = useArtisanSession();
  const [nomComplet, setNomComplet] = useState("");
  const [nomEntreprise, setNomEntreprise] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFichier, setLogoFichier] = useState<File | null>(null);
  const [logoApercu, setLogoApercu] = useState("");
  const [tauxTva, setTauxTva] = useState("20");
  const [siret, setSiret] = useState("");
  const [numeroTva, setNumeroTva] = useState("");
  const [iban, setIban] = useState("");
  const [conditionsPaiement, setConditionsPaiement] = useState("");
  const [stripeAccountId, setStripeAccountId] = useState("");
  const [stripePaiementActif, setStripePaiementActif] = useState(false);
  const [enCoursStripe, setEnCoursStripe] = useState(false);
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!artisanId) return;

    async function charger() {
      const { data } = await supabase.from("artisans").select("*").eq("id", artisanId).maybeSingle();
      if (data) {
        setNomComplet(data.nom_complet || "");
        setNomEntreprise(data.nom_entreprise || "");
        setTelephone(data.telephone || "");
        setAdresse(data.adresse || "");
        setCodePostal(data.code_postal || "");
        setVille(data.ville || "");
        setLogoUrl(data.logo_url || "");
        setLogoApercu(data.logo_url || "");
        setTauxTva(data.taux_tva !== null && data.taux_tva !== undefined ? String(data.taux_tva) : "20");
        setSiret(data.siret || "");
        setNumeroTva(data.numero_tva || "");
        setIban(data.iban || "");
        setConditionsPaiement(data.conditions_paiement || "");
        setStripeAccountId(data.stripe_account_id || "");
        setStripePaiementActif(!!data.stripe_paiement_actif);
      }
      setChargement(false);
    }
    charger();
  }, [artisanId]);

  useEffect(() => {
    if (!session || !stripeAccountId || stripePaiementActif) return;

    async function verifierStatut() {
      const res = await fetch("/api/statut-paiements", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (typeof data.actif === "boolean") setStripePaiementActif(data.actif);
    }
    verifierStatut();
  }, [session, stripeAccountId, stripePaiementActif]);

  async function connecterPaiements() {
    setEnCoursStripe(true);
    setMessage("");

    try {
      let accountToken: string | undefined;

      if (!stripeAccountId) {
        // Obligatoire pour les plateformes basees en France (conformite DSP2) :
        // Stripe exige un jeton de compte v2 cree cote navigateur (avec la cle
        // publique) avant toute creation de compte connecte avec configuration
        // marchand. Ce jeton ne contient que l'acceptation des conditions,
        // le reste des informations est collecte par Stripe lors de l'inscription.
        const resToken = await fetch("https://api.stripe.com/v2/core/account_tokens", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}`,
            "Content-Type": "application/json",
            "Stripe-Version": "2026-07-29.dahlia",
          },
          body: JSON.stringify({
            contact_email: session?.user?.email || undefined,
            display_name: nomEntreprise || nomComplet || undefined,
          }),
        });
        const dataToken = await resToken.json();

        if (!resToken.ok) {
          setMessage("Erreur : " + (dataToken.error?.message || "création du jeton Stripe impossible"));
          setEnCoursStripe(false);
          return;
        }
        accountToken = dataToken.id;
      }

      const res = await fetch("/api/connecter-paiements", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ accountToken }),
      });
      const texte = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(texte);
      } catch {
        setMessage(`Erreur serveur (${res.status}) : ${texte.slice(0, 300)}`);
        setEnCoursStripe(false);
        return;
      }

      if (data.erreur) {
        setMessage("Erreur : " + data.erreur);
        setEnCoursStripe(false);
        return;
      }

      window.location.href = data.url;
    } catch (e: any) {
      setMessage("Erreur : " + e.message);
      setEnCoursStripe(false);
    }
  }

  function choisirLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0] || null;
    setLogoFichier(fichier);
    if (fichier) setLogoApercu(URL.createObjectURL(fichier));
  }

  function supprimerLogo() {
    setLogoFichier(null);
    setLogoUrl("");
    setLogoApercu("");
  }

  async function enregistrer() {
    if (!nomComplet.trim() || !telephone.trim() || !adresse.trim() || !codePostal.trim() || !ville.trim() || !siret.trim() || !tauxTva.trim()) {
      setMessage("Merci de remplir tous les champs obligatoires (marqués d'un *).");
      return;
    }

    setMessage("Enregistrement...");

    let urlLogo = logoUrl;

    if (logoFichier) {
      const formData = new FormData();
      formData.append("logo", logoFichier);

      const res = await fetch("/api/upload-logo", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });
      const data = await res.json();

      if (data.erreur) {
        setMessage("Erreur upload logo : " + data.erreur);
        return;
      }

      urlLogo = data.url;
      setLogoUrl(urlLogo);
      setLogoFichier(null);
    }

    const infos = {
      nom_complet: nomComplet,
      nom_entreprise: nomEntreprise,
      telephone,
      adresse,
      code_postal: codePostal,
      ville,
      logo_url: urlLogo,
      taux_tva: Number(tauxTva) || 0,
      siret,
      numero_tva: numeroTva,
      iban,
      conditions_paiement: conditionsPaiement,
    };

    const { error } = await supabase.from("artisans").update(infos).eq("id", artisanId);
    if (error) {
      setMessage("Erreur : " + error.message);
      return;
    }

    setMessage("Profil enregistré !");
  }

  if (chargementSession || chargement) {
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

      <h1 className="page-title">Mon profil</h1>

      <div className="tuiles-carrees">
        <Link href="/abonnement" className="tuile-carree">
          <span className="tuile-carree-titre">Mon abonnement</span>
          <span className="hint" style={{ margin: 0 }}>Gérer mon abonnement VolpeVox</span>
        </Link>

        {stripePaiementActif ? (
          <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" className="tuile-carree">
            <span className="tuile-carree-titre">Paiement en ligne</span>
            <span style={{ color: "var(--success)", fontWeight: 600, fontSize: 13 }}>✓ Activé — voir mon espace Stripe</span>
          </a>
        ) : (
          <button type="button" className="tuile-carree" onClick={connecterPaiements} disabled={enCoursStripe}>
            <span className="tuile-carree-titre">Paiement en ligne</span>
            <span className="hint" style={{ margin: 0 }}>
              {stripeAccountId ? "Reprendre l'inscription Stripe" : "Connecter Stripe (sans commission)"}
            </span>
          </button>
        )}
      </div>

      <div className="card">
        <p className="hint" style={{ margin: "0 0 12px" }}>
          Les champs marqués d'un * sont obligatoires.
        </p>

        <label className="field-label">Logo (facultatif)</label>
        {logoApercu ? (
          <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
            <img
              src={logoApercu}
              alt="Logo actuel"
              style={{ maxWidth: 150, maxHeight: 150, display: "block", borderRadius: 8 }}
            />
            <button
              type="button"
              onClick={supprimerLogo}
              aria-label="Supprimer le logo"
              style={{
                position: "absolute",
                top: -8,
                right: -8,
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "var(--danger)",
                color: "#fff",
                border: "2px solid var(--card-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 14,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <input type="file" accept="image/*" onChange={choisirLogo} style={{ display: "block", marginBottom: 12 }} />
        )}

        <label className="field-label">
          Nom et prénom *
          <input className="field" style={{ marginTop: 6 }} value={nomComplet} onChange={(e) => setNomComplet(e.target.value)} />
        </label>
        <label className="field-label">
          Nom de l'entreprise (facultatif)
          <input className="field" style={{ marginTop: 6 }} value={nomEntreprise} onChange={(e) => setNomEntreprise(e.target.value)} />
        </label>
        <label className="field-label">
          Téléphone *
          <input className="field" style={{ marginTop: 6 }} value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        </label>
        <label className="field-label">
          Adresse *
          <input className="field" style={{ marginTop: 6 }} value={adresse} onChange={(e) => setAdresse(e.target.value)} />
        </label>
        <div className="field-row">
          <label className="field-label" style={{ flex: "1 1 0%", minWidth: 0, marginBottom: 0 }}>
            Code postal *
            <input className="field" style={{ marginTop: 6, width: "100%" }} value={codePostal} onChange={(e) => setCodePostal(e.target.value)} />
          </label>
          <label className="field-label" style={{ flex: "2 1 0%", minWidth: 0, marginBottom: 0 }}>
            Ville *
            <input className="field" style={{ marginTop: 6, width: "100%" }} value={ville} onChange={(e) => setVille(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 15, marginTop: 0, marginBottom: 14, color: "var(--ink)" }}>Informations légales</h2>

        <label className="field-label">
          SIRET *
          <input className="field" style={{ marginTop: 6 }} value={siret} onChange={(e) => setSiret(e.target.value)} />
        </label>

        <label className="field-label">
          Taux de TVA (%) * — mets 0 si tu es en franchise en base de TVA (auto-entrepreneur)
          <input
            className="field"
            style={{ marginTop: 6 }}
            value={tauxTva}
            onChange={(e) => setTauxTva(e.target.value)}
          />
        </label>

        <label className="field-label">
          N° TVA intracommunautaire (facultatif, si assujetti à la TVA)
          <input className="field" style={{ marginTop: 6 }} value={numeroTva} onChange={(e) => setNumeroTva(e.target.value)} />
        </label>
        <label className="field-label">
          IBAN (pour le RIB, facultatif)
          <input className="field" style={{ marginTop: 6 }} value={iban} onChange={(e) => setIban(e.target.value)} />
        </label>
        <label className="field-label">
          Conditions de paiement (facultatif, ex: Acompte 30% à la commande, solde à la livraison)
          <textarea
            className="field"
            style={{ marginTop: 6 }}
            value={conditionsPaiement}
            onChange={(e) => setConditionsPaiement(e.target.value)}
          />
        </label>

        <button className="btn btn-primary" onClick={enregistrer}>
          Enregistrer
        </button>

        {message && <p className="message">{message}</p>}
      </div>
    </main>
  );
}
