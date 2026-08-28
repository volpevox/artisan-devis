"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { PropositionCommentCaMarche } from "@/components/PropositionCommentCaMarche";
import { useArtisanSession, profilComplet } from "@/lib/useArtisan";

export default function Profil() {
  const router = useRouter();
  const { session, artisanId, loading: chargementSession } = useArtisanSession();
  const [etaitIncomplet, setEtaitIncomplet] = useState(false);
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
  const [assurancePro, setAssurancePro] = useState("");
  const [mediateurConso, setMediateurConso] = useState("");
  // Numerotation : "prochain numero" a attribuer. Rempli avec la valeur
  // actuelle du compteur ; l'artisan peut le faire avancer (reprise d'une
  // numerotation existante) mais pas reculer.
  const [prochainNumeroDevis, setProchainNumeroDevis] = useState("1");
  const [prochainNumeroFacture, setProchainNumeroFacture] = useState("1");
  const numeroDevisCharge = useRef(1);
  const numeroFactureCharge = useRef(1);
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    // Sans abonnement, la ligne "artisans" n'existe pas encore (voir
    // useArtisanSession) -- rien a afficher ici, on renvoie vers l'etape
    // qui doit forcement venir avant : s'abonner.
    if (!chargementSession && !artisanId) {
      router.push("/abonnement");
    }
  }, [artisanId, chargementSession, router]);

  useEffect(() => {
    if (!artisanId) return;

    async function charger() {
      const { data } = await supabase.from("artisans").select("*").eq("id", artisanId).maybeSingle();
      if (data) {
        setEtaitIncomplet(!profilComplet(data));
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
        setAssurancePro(data.assurance_pro || "");
        setMediateurConso(data.mediateur_conso || "");

        const nDevis = Number(data.prochain_numero_devis) || 1;
        const nFacture = Number(data.prochain_numero_facture) || 1;
        numeroDevisCharge.current = nDevis;
        numeroFactureCharge.current = nFacture;
        setProchainNumeroDevis(String(nDevis));
        setProchainNumeroFacture(String(nFacture));
      }
      setChargement(false);
    }
    charger();
  }, [artisanId]);

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

    const nDevis = Number(prochainNumeroDevis);
    const nFacture = Number(prochainNumeroFacture);
    if (!Number.isInteger(nDevis) || nDevis < 1 || !Number.isInteger(nFacture) || nFacture < 1) {
      setMessage("Les prochains numéros de devis et de facture doivent être des nombres entiers positifs.");
      return;
    }
    if (nDevis < numeroDevisCharge.current || nFacture < numeroFactureCharge.current) {
      setMessage(
        `Le prochain numéro ne peut pas être diminué (devis : ${numeroDevisCharge.current} minimum, facture : ${numeroFactureCharge.current} minimum) : la numérotation doit rester continue.`
      );
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

    const infos: Record<string, unknown> = {
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
      assurance_pro: assurancePro,
      mediateur_conso: mediateurConso,
    };

    // On n'ecrit le compteur QUE s'il a change : sinon, enregistrer le profil
    // apres qu'un devis ait ete cree ailleurs (compteur deja avance en base)
    // le ferait reculer a la valeur affichee ici, et le prochain numero
    // ferait doublon.
    if (nDevis !== numeroDevisCharge.current) infos.prochain_numero_devis = nDevis;
    if (nFacture !== numeroFactureCharge.current) infos.prochain_numero_facture = nFacture;

    const { error } = await supabase.from("artisans").update(infos).eq("id", artisanId);
    if (error) {
      setMessage("Erreur : " + error.message);
      return;
    }

    numeroDevisCharge.current = nDevis;
    numeroFactureCharge.current = nFacture;

    // Si l'artisan arrivait ici avec un profil incomplet (juste apres
    // l'inscription, voir useArtisanSession), le profil est maintenant
    // complet : on l'envoie directement vers la page dictee plutot que de le
    // laisser sur ce formulaire. Une simple mise a jour ulterieure (logo,
    // SIRET...) reste sur place avec le message de confirmation habituel.
    if (etaitIncomplet) {
      router.push("/");
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
      <PropositionCommentCaMarche />

      <h1 className="page-title">Mon profil</h1>
      <p className="hint" style={{ margin: "0 0 16px" }}>
        Ces informations apparaissent sur tes devis et factures. Les champs marqués d'un{" "}
        <span style={{ color: "var(--ink)", fontWeight: 700 }}>*</span> sont obligatoires.
      </p>

      <div className="form-bloc">
        <p className="form-bloc-titre">Identité</p>
        <div className="form-carte">
          <div className="champ">
            <label className="champ-label" htmlFor="p-nom">
              Nom et prénom <span className="obligatoire">*</span>
            </label>
            <input id="p-nom" className="field" value={nomComplet} onChange={(e) => setNomComplet(e.target.value)} />
          </div>
          <div className="champ">
            <label className="champ-label" htmlFor="p-entreprise">
              Nom de l'entreprise <span style={{ fontWeight: 400 }}>(facultatif)</span>
            </label>
            <input
              id="p-entreprise"
              className="field"
              value={nomEntreprise}
              onChange={(e) => setNomEntreprise(e.target.value)}
            />
          </div>
          <div className="champ">
            <label className="champ-label" htmlFor="p-tel">
              Téléphone <span className="obligatoire">*</span>
            </label>
            <input id="p-tel" className="field" type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-bloc">
        <p className="form-bloc-titre">Adresse</p>
        <div className="form-carte">
          <div className="champ">
            <label className="champ-label" htmlFor="p-adresse">
              Adresse <span className="obligatoire">*</span>
            </label>
            <input id="p-adresse" className="field" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
          </div>
          <div className="champ champ-duo">
            <div style={{ flex: "1 1 40%" }}>
              <label className="champ-label" htmlFor="p-cp">
                Code postal <span className="obligatoire">*</span>
              </label>
              <input id="p-cp" className="field" inputMode="numeric" value={codePostal} onChange={(e) => setCodePostal(e.target.value)} />
            </div>
            <div style={{ flex: "1 1 60%" }}>
              <label className="champ-label" htmlFor="p-ville">
                Ville <span className="obligatoire">*</span>
              </label>
              <input id="p-ville" className="field" value={ville} onChange={(e) => setVille(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="form-bloc">
        <p className="form-bloc-titre">Informations légales</p>
        <div className="form-carte">
          <div className="champ">
            <label className="champ-label" htmlFor="p-siret">
              SIRET <span className="obligatoire">*</span>
            </label>
            <input id="p-siret" className="field" inputMode="numeric" value={siret} onChange={(e) => setSiret(e.target.value)} />
          </div>

          <div className="champ">
            <label className="champ-label" htmlFor="p-tva">
              Taux de TVA <span className="obligatoire">*</span>
            </label>
            <select id="p-tva" className="field" value={tauxTva} onChange={(e) => setTauxTva(e.target.value)}>
              <option value="0">0 % — Franchise en base (auto-entrepreneur)</option>
              <option value="2.1">2,1 % — Taux particulier</option>
              <option value="5.5">5,5 % — Taux réduit</option>
              <option value="10">10 % — Taux intermédiaire</option>
              <option value="20">20 % — Taux normal</option>
            </select>
            <p className="champ-aide">Choisis 0 % si tu es en franchise en base de TVA.</p>
          </div>

          <div className="champ">
            <label className="champ-label" htmlFor="p-numtva">
              N° TVA intracommunautaire <span style={{ fontWeight: 400 }}>(si assujetti à la TVA)</span>
            </label>
            <input id="p-numtva" className="field" value={numeroTva} onChange={(e) => setNumeroTva(e.target.value)} />
          </div>
          <div className="champ">
            <label className="champ-label" htmlFor="p-iban">
              IBAN <span style={{ fontWeight: 400 }}>(affiché sur les factures, facultatif)</span>
            </label>
            <input id="p-iban" className="field" value={iban} onChange={(e) => setIban(e.target.value)} />
          </div>
          <div className="champ">
            <label className="champ-label" htmlFor="p-conditions">
              Conditions de paiement <span style={{ fontWeight: 400 }}>(facultatif)</span>
            </label>
            <textarea
              id="p-conditions"
              className="field"
              placeholder="Ex : Acompte 30 % à la commande, solde à la livraison"
              value={conditionsPaiement}
              onChange={(e) => setConditionsPaiement(e.target.value)}
            />
          </div>

          <div className="champ">
            <label className="champ-label" htmlFor="p-assurance">
              Assurance professionnelle <span style={{ fontWeight: 400 }}>(facultatif, affichée sur les documents)</span>
            </label>
            <textarea
              id="p-assurance"
              className="field"
              placeholder="Ex : Assurance décennale n° 123456 souscrite auprès de [Assureur], couvrant les chantiers en France métropolitaine."
              value={assurancePro}
              onChange={(e) => setAssurancePro(e.target.value)}
            />
            <p className="champ-aide">Mention obligatoire sur les devis et factures pour les métiers du bâtiment.</p>
          </div>

          <div className="champ">
            <label className="champ-label" htmlFor="p-mediateur">
              Médiateur de la consommation <span style={{ fontWeight: 400 }}>(facultatif)</span>
            </label>
            <textarea
              id="p-mediateur"
              className="field"
              placeholder="Ex : En cas de litige : [nom du médiateur] — [adresse] — [site web]."
              value={mediateurConso}
              onChange={(e) => setMediateurConso(e.target.value)}
            />
            <p className="champ-aide">Mention obligatoire si tu vends à des particuliers.</p>
          </div>
        </div>
      </div>

      <div className="form-bloc">
        <p className="form-bloc-titre">Numérotation</p>
        <div className="form-carte">
          <p className="champ-aide" style={{ margin: "0 0 14px" }}>
            Numéro à partir duquel VolpeVox continue la numérotation. À ajuster si tu reprends une numérotation déjà
            commencée ailleurs (ex : mettre 40 si tu as déjà émis 39 factures). Le numéro peut augmenter mais pas
            diminuer : la numérotation des factures doit rester continue.
          </p>
          <div className="champ champ-duo">
            <div>
              <label className="champ-label" htmlFor="p-num-devis">Prochain numéro de devis</label>
              <input
                id="p-num-devis"
                className="field"
                inputMode="numeric"
                value={prochainNumeroDevis}
                onChange={(e) => setProchainNumeroDevis(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div>
              <label className="champ-label" htmlFor="p-num-facture">Prochain numéro de facture</label>
              <input
                id="p-num-facture"
                className="field"
                inputMode="numeric"
                value={prochainNumeroFacture}
                onChange={(e) => setProchainNumeroFacture(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="form-bloc">
        <p className="form-bloc-titre">Logo</p>
        <div className="form-carte">
          <div className="champ">
            <label className="champ-label">
              Logo de l'entreprise <span style={{ fontWeight: 400 }}>(facultatif, affiché en haut des documents)</span>
            </label>
            {logoApercu ? (
              <div style={{ position: "relative", display: "inline-block", marginTop: 4 }}>
                <img
                  src={logoApercu}
                  alt="Logo actuel"
                  style={{
                    maxWidth: 140,
                    maxHeight: 140,
                    display: "block",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "#fff",
                    padding: 6,
                  }}
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
              <input type="file" accept="image/*" onChange={choisirLogo} style={{ display: "block", marginTop: 4 }} />
            )}
          </div>
        </div>
      </div>

      <button className="btn btn-primary btn-bloc" onClick={enregistrer}>
        Enregistrer
      </button>

      {message && <p className="message" style={{ textAlign: "center" }}>{message}</p>}
    </main>
  );
}
