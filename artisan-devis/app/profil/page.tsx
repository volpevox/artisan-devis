"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { useArtisanSession } from "@/lib/useArtisan";

export default function Profil() {
  const { session, artisanId, loading: chargementSession } = useArtisanSession();
  const [nomEntreprise, setNomEntreprise] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [ville, setVille] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFichier, setLogoFichier] = useState<File | null>(null);
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
        setNomEntreprise(data.nom_entreprise || "");
        setTelephone(data.telephone || "");
        setAdresse(data.adresse || "");
        setVille(data.ville || "");
        setLogoUrl(data.logo_url || "");
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
            identity: {
              attestations: {
                terms_of_service: {
                  account: { shown_and_accepted: true },
                },
              },
            },
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

  async function enregistrer() {
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
    }

    const infos = {
      nom_entreprise: nomEntreprise,
      telephone,
      adresse,
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

      <Link href="/abonnement" className="card" style={{ display: "block", textDecoration: "none" }}>
        <span style={{ fontWeight: 600, color: "var(--text)" }}>Mon abonnement</span>
        <span className="hint" style={{ display: "block", marginTop: 4 }}>
          Gérer mon abonnement VolpeVox
        </span>
      </Link>

      <div className="card">
        <span style={{ fontWeight: 600, color: "var(--text)" }}>Encaisser mes factures en ligne</span>
        <p className="hint" style={{ margin: "4px 0 12px" }}>
          {stripePaiementActif
            ? "Activé — tes clients peuvent payer leurs factures en ligne, l'argent arrive directement sur ton compte."
            : stripeAccountId
              ? "Vérification en cours chez Stripe. Termine ou reprends l'inscription si besoin."
              : "Connecte un compte Stripe pour proposer le paiement en ligne sur tes factures (aucune commission VolpeVox)."}
        </p>
        {!stripePaiementActif && (
          <>
            <button className="btn btn-primary" onClick={connecterPaiements} disabled={enCoursStripe}>
              {stripeAccountId ? "Continuer l'inscription Stripe" : "Connecter Stripe"}
            </button>
            {!stripeAccountId && (
              <p className="hint" style={{ margin: "10px 0 0", fontSize: 12 }}>
                En connectant Stripe, tu acceptes le{" "}
                <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noreferrer">
                  Contrat de compte connecté Stripe
                </a>
                .
              </p>
            )}
          </>
        )}
      </div>

      <div className="card">
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Logo actuel"
            style={{ maxWidth: 150, maxHeight: 150, display: "block", marginBottom: 12, borderRadius: 8 }}
          />
        )}

        <label className="field-label">
          Logo
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFichier(e.target.files?.[0] || null)}
            style={{ display: "block", marginTop: 6 }}
          />
        </label>

        <input
          className="field"
          placeholder="Nom de l'entreprise"
          value={nomEntreprise}
          onChange={(e) => setNomEntreprise(e.target.value)}
        />
        <input
          className="field"
          placeholder="Téléphone"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
        />
        <input
          className="field"
          placeholder="Adresse"
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
        />
        <input
          className="field"
          placeholder="Ville (pour « Fait à ... » sur les devis/factures)"
          value={ville}
          onChange={(e) => setVille(e.target.value)}
        />
      </div>

      <div className="card">
        <h2 style={{ fontSize: 15, marginTop: 0, marginBottom: 14, color: "var(--ink)" }}>Informations légales</h2>

        <input className="field" placeholder="SIRET" value={siret} onChange={(e) => setSiret(e.target.value)} />

        <label className="field-label">
          Taux de TVA (%) — mets 0 si tu es en franchise en base de TVA (auto-entrepreneur)
          <input
            className="field"
            style={{ marginTop: 6 }}
            placeholder="Taux de TVA (%)"
            value={tauxTva}
            onChange={(e) => setTauxTva(e.target.value)}
          />
        </label>

        <input
          className="field"
          placeholder="N° TVA intracommunautaire (si assujetti à la TVA)"
          value={numeroTva}
          onChange={(e) => setNumeroTva(e.target.value)}
        />
        <input
          className="field"
          placeholder="IBAN (pour le RIB, facultatif)"
          value={iban}
          onChange={(e) => setIban(e.target.value)}
        />
        <textarea
          className="field"
          placeholder="Conditions de paiement (ex: Acompte 30% à la commande, solde à la livraison)"
          value={conditionsPaiement}
          onChange={(e) => setConditionsPaiement(e.target.value)}
        />

        <button className="btn btn-primary" onClick={enregistrer}>
          Enregistrer
        </button>

        {message && <p className="message">{message}</p>}
      </div>
    </main>
  );
}
