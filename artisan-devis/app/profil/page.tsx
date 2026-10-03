"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Topbar } from "@/components/Topbar";
import { PropositionCommentCaMarche } from "@/components/PropositionCommentCaMarche";
import { useArtisanSession, profilComplet } from "@/lib/useArtisan";
import { MENTION_PENALITES_RETARD_DEFAUT } from "@/lib/mentionsDocuments";
import { RechercheEntreprise, type InfosEntreprise } from "@/components/RechercheEntreprise";
import { FicheRubrique, ICONES } from "@/components/FicheRubrique";
import { PaiementEnLigne } from "@/components/PaiementEnLigne";
import { MOYENS_PAIEMENT, moyensAcceptes, type MoyenPaiement } from "@/lib/moyensPaiement";
import { separerNomComplet } from "@/lib/prenom";

export default function Profil() {
  const router = useRouter();
  const { session, artisanId, loading: chargementSession } = useArtisanSession();
  const [etaitIncomplet, setEtaitIncomplet] = useState(false);
  // Arrivee depuis « Ton devis est presque pret » (page de dictee) :
  // ?completer=mentions,logo ouvre ces rubriques, ?retour=/?modifier=ID
  // ramene au devis apres Enregistrer.
  const [aCompleter, setACompleter] = useState<string[]>([]);
  const [retour, setRetour] = useState("");
  const [retourStripe, setRetourStripe] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setACompleter((params.get("completer") || "").split(",").filter(Boolean));
    // Retour de l'inscription Stripe (paiement en ligne) : rubrique Paiement ouverte.
    setRetourStripe(Boolean(params.get("stripe_retour")));
    const r = params.get("retour") || "";
    // Seulement un chemin interne a l'appli.
    if (r.startsWith("/") && !r.startsWith("//")) setRetour(r);
  }, []);
  useEffect(() => {
    if (aCompleter.length === 0) return;
    const t = setTimeout(
      () =>
        document
          .getElementById(aCompleter.includes("logo") ? "rubrique-logo" : "rubrique-mentions")
          ?.scrollIntoView({ block: "start", behavior: "smooth" }),
      400
    );
    return () => clearTimeout(t);
  }, [aCompleter]);
  useEffect(() => {
    if (!retourStripe) return;
    const t = setTimeout(
      () => document.getElementById("rubrique-paiement")?.scrollIntoView({ block: "start", behavior: "smooth" }),
      400
    );
    return () => clearTimeout(t);
  }, [retourStripe]);
  // Ecran de depart : les champs a verifier n'apparaissent qu'une fois
  // l'entreprise choisie dans l'annuaire, ou "Je ne me trouve pas" touche.
  const [formulaireDepart, setFormulaireDepart] = useState<"" | "annuaire" | "main">("");
  const blocFormulaireDepart = useRef<HTMLDivElement>(null);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  // "Prenom Nom" : ce qui s'affiche sur les devis et factures (nom_complet).
  const nomComplet = `${prenom.trim()} ${nom.trim()}`.trim();
  const [nomEntreprise, setNomEntreprise] = useState("");
  // "A ton nom" (false) ou "En societe" (true) ; null = pas encore repondu
  // (comptes crees avant la question). Voir lib/nomAffichage.ts.
  const [estSociete, setEstSociete] = useState<boolean | null>(null);
  const [formeCapital, setFormeCapital] = useState("");
  const [rcsVille, setRcsVille] = useState("");
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
  const [bic, setBic] = useState("");
  const [titulaireCompte, setTitulaireCompte] = useState("");
  const [moyensPaiement, setMoyensPaiement] = useState<MoyenPaiement[]>(moyensAcceptes(null));
  const [conditionsPaiement, setConditionsPaiement] = useState("");
  const [assurancePro, setAssurancePro] = useState("");
  const [mediateurConso, setMediateurConso] = useState("");
  const [penalitesRetard, setPenalitesRetard] = useState(MENTION_PENALITES_RETARD_DEFAUT);
  const [validiteDevis, setValiditeDevis] = useState("30");
  // Numerotation : "prochain numero" a attribuer. Rempli avec la valeur
  // actuelle du compteur ; l'artisan peut le faire avancer (reprise d'une
  // numerotation existante) mais pas reculer.
  const [prochainNumeroDevis, setProchainNumeroDevis] = useState("1");
  const [prochainNumeroFacture, setProchainNumeroFacture] = useState("1");
  const numeroDevisCharge = useRef(1);
  const numeroFactureCharge = useRef(1);
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(true);
  // Ecran de depart (profil incomplet) : la TVA est une question simple,
  // sans reponse par defaut, pour que l'artisan la choisisse vraiment.
  const [tvaChoix, setTvaChoix] = useState<"" | "non" | "oui">("");

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
        // Deja commence lors d'une visite precedente : champs affiches.
        if (data.siret || data.adresse || data.nom_complet) setFormulaireDepart("main");
        const separe = separerNomComplet(data.nom_complet || "", data.prenom);
        setPrenom(separe.prenom);
        setNom(separe.nom);
        setNomEntreprise(data.nom_entreprise || "");
        setEstSociete(typeof data.est_societe === "boolean" ? data.est_societe : null);
        setFormeCapital(data.forme_capital || "");
        setRcsVille(data.rcs_ville || "");
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
        setBic(data.bic || "");
        setTitulaireCompte(data.titulaire_compte || "");
        setMoyensPaiement(moyensAcceptes(data.moyens_paiement));
        setConditionsPaiement(data.conditions_paiement || "");
        setAssurancePro(data.assurance_pro || "");
        setMediateurConso(data.mediateur_conso || "");
        setPenalitesRetard(data.penalites_retard || MENTION_PENALITES_RETARD_DEFAUT);
        setValiditeDevis(
          data.duree_validite_devis !== null && data.duree_validite_devis !== undefined
            ? String(data.duree_validite_devis)
            : "30"
        );

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

  // Champs a remplir : on les affiche et on fait defiler jusqu'a eux.
  function ouvrirFormulaireDepart(mode: "annuaire" | "main") {
    setFormulaireDepart(mode);
    setTimeout(() => blocFormulaireDepart.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  // Pre-remplissage depuis l'annuaire des entreprises (ecran de depart).
  function remplirDepuisAnnuaire(infos: InfosEntreprise) {
    ouvrirFormulaireDepart("annuaire");
    if (infos.prenom || infos.nom) {
      setPrenom(infos.prenom);
      setNom(infos.nom);
    } else if (infos.nomComplet) {
      setPrenom("");
      setNom(infos.nomComplet);
    }
    setNomEntreprise(infos.nomEntreprise);
    setEstSociete(infos.estSociete);
    // "SARL au capital de " : il ne reste qu'a taper le montant.
    if (infos.estSociete && infos.formeJuridique && !formeCapital.trim()) {
      setFormeCapital(`${infos.formeJuridique} au capital de `);
    }
    if (infos.adresse) setAdresse(infos.adresse);
    if (infos.codePostal) setCodePostal(infos.codePostal);
    if (infos.ville) setVille(infos.ville);
    if (infos.siret) setSiret(infos.siret);
  }

  function choisirTva(choix: "non" | "oui") {
    setTvaChoix(choix);
    setTauxTva(choix === "non" ? "0" : "20");
  }

  function demarrer() {
    if (!tvaChoix) {
      setMessage("Dis-nous si tu factures la TVA.");
      return;
    }
    enregistrer();
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
    if ((!estSociete && (!prenom.trim() || !nom.trim())) || !telephone.trim() || !adresse.trim() || !codePostal.trim() || !ville.trim() || !siret.trim() || !tauxTva.trim()) {
      setMessage("Merci de remplir tous les champs obligatoires (marqués d'un *).");
      return;
    }
    if (estSociete === null) {
      setMessage("Dis-nous si tu travailles à ton nom ou en société.");
      return;
    }
    if (estSociete && (!nomEntreprise.trim() || !formeCapital.trim() || !rcsVille.trim())) {
      setMessage("En société, le nom de la société, la forme et le capital, et la ville du RCS sont obligatoires.");
      return;
    }
    if (estSociete && !/\d/.test(formeCapital)) {
      setMessage("Indique le montant du capital (ex : SARL au capital de 5 000 €).");
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
      prenom: prenom.trim(),
      nom_entreprise: nomEntreprise,
      est_societe: estSociete,
      forme_capital: formeCapital.trim() || null,
      rcs_ville: rcsVille.trim() || null,
      telephone,
      adresse,
      code_postal: codePostal,
      ville,
      logo_url: urlLogo,
      taux_tva: Number(tauxTva) || 0,
      siret,
      numero_tva: numeroTva,
      iban,
      bic: bic.trim().toUpperCase() || null,
      titulaire_compte: titulaireCompte.trim() || null,
      moyens_paiement: moyensPaiement,
      conditions_paiement: conditionsPaiement,
      assurance_pro: assurancePro,
      mediateur_conso: mediateurConso,
      // Champ laisse tel quel (= texte par defaut) -> on stocke null pour
      // garder le repli dynamique cote appli.
      penalites_retard:
        penalitesRetard.trim() === MENTION_PENALITES_RETARD_DEFAUT.trim() ? null : penalitesRetard,
      duree_validite_devis: Number(validiteDevis) || 0,
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

    if (retour) {
      router.push(retour);
      return;
    }

    setMessage("Profil enregistré !");
  }

  // En societe, le prenom et le nom (du gerant) sont facultatifs.
  const etoileOuFacultatif = estSociete ? (
    <span style={{ fontWeight: 400 }}>(facultatif)</span>
  ) : (
    <span className="obligatoire">*</span>
  );

  // Question "A ton nom / En societe" et champs propres aux societes,
  // communs a l'ecran de depart (prefixe "d") et au profil complet ("p").
  const choixStatut = (
    <div className="champ">
      <p className="champ-label">
        Tu travailles <span className="obligatoire">*</span>
      </p>
      <div className="choix-tva">
        <button type="button" className={estSociete === false ? "actif" : ""} onClick={() => setEstSociete(false)}>
          <strong>À ton nom</strong>
          <small>Micro-entreprise, EI</small>
        </button>
        <button type="button" className={estSociete === true ? "actif" : ""} onClick={() => setEstSociete(true)}>
          <strong>En société</strong>
          <small>SARL, EURL, SAS…</small>
        </button>
      </div>
    </div>
  );

  const champEntreprise = (prefixe: string) => (
    <div className="champ">
      <label className="champ-label" htmlFor={`${prefixe}-entreprise`}>
        {estSociete ? (
          <>
            Nom de la société <span className="obligatoire">*</span>
          </>
        ) : (
          <>
            Nom de l'entreprise <span style={{ fontWeight: 400 }}>(facultatif)</span>
          </>
        )}
      </label>
      <input
        id={`${prefixe}-entreprise`}
        className="field"
        value={nomEntreprise}
        onChange={(e) => setNomEntreprise(e.target.value)}
      />
      {estSociete ? <p className="champ-aide">C'est lui qui apparaît en premier sur tes documents.</p> : null}
    </div>
  );

  const champsSociete = (prefixe: string) =>
    estSociete ? (
      <>
        <div className="champ">
          <label className="champ-label" htmlFor={`${prefixe}-forme`}>
            Forme et capital <span className="obligatoire">*</span>
          </label>
          <input
            id={`${prefixe}-forme`}
            className="field"
            placeholder="Ex : SARL au capital de 5 000 €"
            value={formeCapital}
            onChange={(e) => setFormeCapital(e.target.value)}
          />
        </div>
        <div className="champ">
          <label className="champ-label" htmlFor={`${prefixe}-rcs`}>
            Ville du RCS <span className="obligatoire">*</span>
          </label>
          <input
            id={`${prefixe}-rcs`}
            className="field"
            placeholder="Ex : Lyon"
            value={rcsVille}
            onChange={(e) => setRcsVille(e.target.value)}
          />
          <p className="champ-aide">La ville du greffe où ta société est immatriculée (sur ton Kbis : « RCS Lyon »).</p>
        </div>
      </>
    ) : null;

  if (chargementSession || chargement) {
    return (
      <main className="page-shell">
        <Topbar />
        <p className="message">Chargement...</p>
      </main>
    );
  }

  // Premiere visite (profil incomplet) : ecran de depart court, seulement les
  // infos obligatoires sur un devis, pre-remplies depuis l'annuaire des
  // entreprises. Le reste (logo, IBAN, mentions...) se complete plus tard
  // dans le profil complet ci-dessous.
  if (etaitIncomplet) {
    return (
      <main className="page-shell">
        <Topbar />
        <PropositionCommentCaMarche />

        <h1 className="page-title">Tes infos</h1>
        <p className="hint" style={{ margin: "0 0 16px" }}>
          Elles apparaissent sur tes devis et factures. Ça prend une minute.
        </p>

        <div className="form-bloc">
          <p className="form-bloc-titre">1. Trouve ton entreprise</p>
          <div className="form-carte">
            <p className="champ-aide" style={{ margin: "0 0 14px" }}>
              On remplit ton adresse et ton SIRET depuis l'annuaire officiel des entreprises.
            </p>
            <RechercheEntreprise
              onChoisir={remplirDepuisAnnuaire}
              onPasTrouve={() => {
                if (formulaireDepart !== "main") ouvrirFormulaireDepart("main");
              }}
            />
          </div>
        </div>

        {formulaireDepart && (
          <>
            <div className="form-bloc" ref={blocFormulaireDepart} style={{ scrollMarginTop: 16 }}>
              <p className="form-bloc-titre">{formulaireDepart === "annuaire" ? "2. Vérifie" : "2. Tes infos"}</p>
              {formulaireDepart === "main" && (
                <p className="hint" style={{ margin: "0 0 10px" }}>
                  Certaines entreprises n'apparaissent pas dans l'annuaire public : c'est normal, remplis les champs à la main.
                </p>
              )}
              <div className="form-carte">
                {choixStatut}
                <div className="champ">
                  <label className="champ-label" htmlFor="d-prenom">
                    Prénom {etoileOuFacultatif}
                  </label>
                  <input
                    id="d-prenom"
                    className="field"
                    autoComplete="given-name"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                  />
                </div>
                <div className="champ">
                  <label className="champ-label" htmlFor="d-nom">
                    Nom {etoileOuFacultatif}
                  </label>
                  <input
                    id="d-nom"
                    className="field"
                    autoComplete="family-name"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                  />
                </div>
                {champEntreprise("d")}
                <div className="champ">
                  <label className="champ-label" htmlFor="d-tel">
                    Téléphone <span className="obligatoire">*</span>
                  </label>
                  <input id="d-tel" className="field" type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
                </div>
                <div className="champ">
                  <label className="champ-label" htmlFor="d-siret">
                    SIRET <span className="obligatoire">*</span>
                  </label>
                  <input id="d-siret" className="field" inputMode="numeric" value={siret} onChange={(e) => setSiret(e.target.value)} />
                  {formulaireDepart === "main" && (
                    <p className="champ-aide">14 chiffres, sur ton Kbis, ton avis de situation INSEE ou ton espace URSSAF.</p>
                  )}
                </div>
                {champsSociete("d")}
                <div className="champ">
                  <label className="champ-label" htmlFor="d-adresse">
                    Adresse <span className="obligatoire">*</span>
                  </label>
                  <input id="d-adresse" className="field" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
                </div>
                <div className="champ champ-duo">
                  <div style={{ flex: "1 1 40%" }}>
                    <label className="champ-label" htmlFor="d-cp">
                      Code postal <span className="obligatoire">*</span>
                    </label>
                    <input id="d-cp" className="field" inputMode="numeric" value={codePostal} onChange={(e) => setCodePostal(e.target.value)} />
                  </div>
                  <div style={{ flex: "1 1 60%" }}>
                    <label className="champ-label" htmlFor="d-ville">
                      Ville <span className="obligatoire">*</span>
                    </label>
                    <input id="d-ville" className="field" value={ville} onChange={(e) => setVille(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-bloc">
              <p className="form-bloc-titre">3. Tu factures la TVA ?</p>
              <div className="form-carte">
                <div className="choix-tva">
                  <button type="button" className={tvaChoix === "non" ? "actif" : ""} onClick={() => choisirTva("non")}>
                    <strong>Non</strong>
                    <small>Franchise en base (micro-entreprise)</small>
                  </button>
                  <button type="button" className={tvaChoix === "oui" ? "actif" : ""} onClick={() => choisirTva("oui")}>
                    <strong>Oui</strong>
                    <small>Je facture la TVA</small>
                  </button>
                </div>
                {tvaChoix === "oui" && (
                  <div className="champ" style={{ marginTop: 14 }}>
                    <label className="champ-label" htmlFor="d-tva">
                      Taux habituel
                    </label>
                    <select id="d-tva" className="field" value={tauxTva} onChange={(e) => setTauxTva(e.target.value)}>
                      <option value="20">20 % — Taux normal</option>
                      <option value="10">10 % — Travaux de rénovation</option>
                      <option value="5.5">5,5 % — Rénovation énergétique</option>
                      <option value="2.1">2,1 % — Taux particulier</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <button className="btn btn-primary btn-bloc" onClick={demarrer}>
              C'est parti →
            </button>
            {message && <p className="message" style={{ textAlign: "center" }}>{message}</p>}
            <p className="hint" style={{ textAlign: "center", margin: "12px 0 24px" }}>
              Logo, IBAN… tu pourras les ajouter plus tard dans « Mon compte ».
            </p>
          </>
        )}
      </main>
    );
  }

  // --- Etat des rubriques (bord vert = complet, or = a completer, gris =
  // facultatif) et parcours de la carte de visite. Calcule sur les valeurs
  // en cours de saisie : la carte se met a jour en direct.
  const okIdentite = Boolean(
    telephone.trim() && estSociete !== null && (estSociete ? nomEntreprise.trim() : prenom.trim() && nom.trim())
  );
  const okAdresse = Boolean(adresse.trim() && codePostal.trim() && ville.trim());
  const okLegal = Boolean(siret.trim() && tauxTva.trim() && (!estSociete || (formeCapital.trim() && rcsVille.trim())));
  const okMentions = Boolean(assurancePro.trim());
  const okLogo = Boolean(logoApercu);
  const okPaiement = Boolean(conditionsPaiement.trim() || iban.trim());

  const ETAPES = [
    {
      nom: "Identité",
      fait: okIdentite && okAdresse,
      conseil:
        estSociete === null
          ? "Dis-nous si tu travailles à ton nom ou en société (rubrique Identité)."
          : "Complète ton identité et ton adresse.",
    },
    { nom: "Légal", fait: okLegal, conseil: "Ajoute ton SIRET et ta TVA." },
    { nom: "Logo", fait: okLogo, conseil: "", facultatif: true },
  ];
  // Le logo est un bonus : sans lui, la carte passe quand meme au vert.
  const prochaine = ETAPES.find((e) => !e.fait && !e.facultatif);
  const premiereNonFaite = ETAPES.findIndex((e) => !e.fait);
  const indexProchaine = premiereNonFaite === -1 ? ETAPES.length : premiereNonFaite;
  const largeurTrait = indexProchaine > 1 ? ((indexProchaine - 1) / (ETAPES.length - 1)) * 76 : 0;

  const libelleTva = tauxTva === "0" ? "TVA non applicable" : `TVA ${tauxTva.replace(".", ",")} %`;
  const initialesVisite = (nomEntreprise || nomComplet)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase())
    .join("");
  const resume = (...morceaux: string[]) => morceaux.filter((m) => m && m.trim()).join(" · ");
  const adresseComplete = [adresse, [codePostal, ville].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <main className="page-shell">
      <Topbar />
      <PropositionCommentCaMarche />

      <h1 className="page-title">Mon compte</h1>
      <p className="page-sous-titre">Ces informations apparaissent sur tes devis et factures.</p>

      {retour ? (
        <div className="rappel-mentions" style={{ marginBottom: 16 }}>
          <span>Complète les rubriques ouvertes, puis touche « Enregistrer » en bas : tu reviendras à ton devis.</span>
          <button type="button" onClick={() => router.push(retour)}>
            ← Revenir au devis
          </button>
        </div>
      ) : null}

      {/* Carte de visite : l'en-tete tel que le voient les clients */}
      <div className={`fiche fiche-visite${prochaine ? "" : " fiche--ok"}`}>
        <div className="fiche-visite-haut">
          <div className="fiche-visite-logo">
            {logoApercu ? <img src={logoApercu} alt="" /> : initialesVisite || "?"}
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="fiche-visite-nom">{(estSociete ? nomEntreprise : nomComplet) || nomComplet || "Ton nom"}</p>
            <p className="fiche-visite-meta">
              {(estSociete ? nomComplet : nomEntreprise) ? (
                <>
                  {estSociete ? nomComplet : nomEntreprise}
                  <br />
                </>
              ) : null}
              {resume(adresseComplete, telephone)}
            </p>
          </div>
        </div>
        <div className="fiche-visite-legal">
          {siret ? <span>SIRET {siret}</span> : null}
          <span>{libelleTva}</span>
        </div>
        <div className="carte-doc-parcours" style={{ marginBottom: 6 }}>
          <span className="carte-doc-parcours-fait" style={{ width: `${largeurTrait}%` }} />
          {ETAPES.map((e) => (
            <div key={e.nom} className={`carte-doc-etape${e.fait ? " fait" : ""}${prochaine === e ? " actif" : ""}`}>
              {e.nom}
            </div>
          ))}
        </div>
        <p className={`carte-doc-statut ${prochaine ? "or" : "vert"}`} style={{ margin: "4px 0 0" }}>
          {prochaine ? prochaine.conseil : "✓ Tes documents sont complets."}
        </p>
        {!prochaine && !okLogo ? (
          <p className="fiche-visite-bonus">Bonus : ajoute ton logo (rubrique Logo) pour des documents à ton image.</p>
        ) : null}
        <Link href="/exemple-devis" className="carte-doc-secondaire fiche-visite-exemple">
          📄 Voir un exemple de devis
        </Link>
      </div>

      <FicheRubrique
        etat={okIdentite ? "ok" : "attente"}
        icone={ICONES.identite}
        titre="Identité"
        resume={resume(nomComplet, nomEntreprise, telephone) || "Ton nom et ton téléphone"}
      >
        {choixStatut}
        <div className="champ">
          <label className="champ-label" htmlFor="p-prenom">
            Prénom {etoileOuFacultatif}
          </label>
          <input
            id="p-prenom"
            className="field"
            autoComplete="given-name"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
          />
        </div>
        <div className="champ">
          <label className="champ-label" htmlFor="p-nom">
            Nom {etoileOuFacultatif}
          </label>
          <input
            id="p-nom"
            className="field"
            autoComplete="family-name"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </div>
        {champEntreprise("p")}
        <div className="champ">
          <label className="champ-label" htmlFor="p-tel">
            Téléphone <span className="obligatoire">*</span>
          </label>
          <input id="p-tel" className="field" type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        </div>
      </FicheRubrique>

      <FicheRubrique
        etat={okAdresse ? "ok" : "attente"}
        icone={ICONES.adresse}
        titre="Adresse"
        resume={adresseComplete || "Ton adresse professionnelle"}
      >
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
      </FicheRubrique>

      <FicheRubrique
        etat={okLegal ? "ok" : "attente"}
        icone={ICONES.legal}
        titre="SIRET et TVA"
        resume={resume(siret, tauxTva === "0" ? "Franchise en base" : libelleTva) || "Obligatoires sur tes documents"}
      >
        <div className="champ">
          <label className="champ-label" htmlFor="p-siret">
            SIRET <span className="obligatoire">*</span>
          </label>
          <input id="p-siret" className="field" inputMode="numeric" value={siret} onChange={(e) => setSiret(e.target.value)} />
        </div>
        {champsSociete("p")}
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
      </FicheRubrique>

      <div id="rubrique-logo" style={{ scrollMarginTop: 80 }} />
      <FicheRubrique
        etat={okLogo ? "ok" : "neutre"}
        icone={ICONES.logo}
        ouvert={aCompleter.includes("logo") || undefined}
        titre="Logo"
        resume={okLogo ? "Affiché en haut de tes documents" : "Pas de logo : tes initiales s'affichent"}
      >
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
      </FicheRubrique>

      <div id="rubrique-paiement" style={{ scrollMarginTop: 80 }} />
      <FicheRubrique
        etat={okPaiement ? "ok" : "neutre"}
        icone={ICONES.paiement}
        titre="Paiement"
        ouvert={retourStripe || undefined}
        resume={
          resume(
            conditionsPaiement,
            moyensPaiement.map((v) => MOYENS_PAIEMENT.find((m) => m.valeur === v)?.libelle).join(", "),
            moyensPaiement.includes("virement") && iban ? "IBAN renseigné" : "",
            validiteDevis !== "0" ? `devis valables ${validiteDevis} j` : ""
          ) || "Conditions, IBAN, validité des devis"
        }
      >
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
          <p className="champ-label">Moyens de paiement acceptés</p>
          <div className="choix-moyens">
            {MOYENS_PAIEMENT.map((m) => {
              const coche = moyensPaiement.includes(m.valeur);
              return (
                <button
                  key={m.valeur}
                  type="button"
                  aria-pressed={coche}
                  className={coche ? "actif" : ""}
                  onClick={() =>
                    setMoyensPaiement((liste) =>
                      coche ? liste.filter((v) => v !== m.valeur) : moyensAcceptes([...liste, m.valeur])
                    )
                  }
                >
                  {coche ? "✓ " : ""}
                  {m.libelle}
                </button>
              );
            })}
          </div>
          <p className="champ-aide">Proposés au client dans le mail de la facture et sur la facture.</p>
        </div>
        {moyensPaiement.includes("virement") && (
          <>
            <div className="champ">
              <label className="champ-label" htmlFor="p-iban">IBAN</label>
              <input
                id="p-iban"
                className="field"
                autoCapitalize="characters"
                autoCorrect="off"
                placeholder="FR76 1234 5678 9012 3456 7890 123"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
              />
            </div>
            <div className="champ champ-duo">
              <div>
                <label className="champ-label" htmlFor="p-bic">BIC</label>
                <input
                  id="p-bic"
                  className="field"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  placeholder="BNPAFRPPXXX"
                  value={bic}
                  onChange={(e) => setBic(e.target.value)}
                />
              </div>
              <div>
                <label className="champ-label" htmlFor="p-titulaire">Titulaire du compte</label>
                <input
                  id="p-titulaire"
                  className="field"
                  placeholder={nomComplet || "Jean Dupont"}
                  value={titulaireCompte}
                  onChange={(e) => setTitulaireCompte(e.target.value)}
                />
              </div>
            </div>
            <p className="champ-aide" style={{ marginTop: -6, marginBottom: 18 }}>
              Ils sont sur ton RIB (application de ta banque). Affichés sur tes factures pour que le client puisse te
              payer par virement.
            </p>
          </>
        )}
        <PaiementEnLigne nomAffiche={nomEntreprise || nomComplet} />
        <div className="champ">
          <label className="champ-label" htmlFor="p-validite">Durée de validité des devis</label>
          <select id="p-validite" className="field" value={validiteDevis} onChange={(e) => setValiditeDevis(e.target.value)}>
            <option value="15">15 jours</option>
            <option value="30">30 jours</option>
            <option value="45">45 jours</option>
            <option value="60">60 jours</option>
            <option value="90">90 jours</option>
            <option value="0">Ne pas afficher</option>
          </select>
          <p className="champ-aide">Ajoute « Ce devis est valable jusqu'au … » sur les devis (pas les factures).</p>
        </div>
        <div className="champ">
          <label className="champ-label" htmlFor="p-penalites">Pénalités de retard (facture)</label>
          <textarea
            id="p-penalites"
            className="field"
            rows={4}
            value={penalitesRetard}
            onChange={(e) => setPenalitesRetard(e.target.value)}
          />
          <p className="champ-aide">
            Texte affiché en bas des factures. Laisse le texte par défaut, ou remplace-le par la formulation de tes
            CGV (le taux ne peut pas être inférieur à 3× le taux d'intérêt légal).
          </p>
        </div>
      </FicheRubrique>

      {/* Reglages facultatifs, replies par defaut pour garder la page simple. */}
      <details className="autres-reglages" open={aCompleter.includes("mentions") || undefined}>
        <summary>Autres réglages (facultatif)</summary>
        <div id="rubrique-mentions" style={{ scrollMarginTop: 80 }} />
        <FicheRubrique
          etat={okMentions ? "ok" : "neutre"}
          ouvert={aCompleter.includes("mentions") || undefined}
          icone={ICONES.mentions}
          titre="Assurance et médiateur"
          resume={
            resume(assurancePro ? "Assurance renseignée" : "", mediateurConso ? "médiateur renseigné" : "") ||
            "Assurance pro, médiateur"
          }
        >
          <div className="champ">
            <label className="champ-label" htmlFor="p-assurance">
              Assurance professionnelle <span style={{ fontWeight: 400 }}>(affichée sur les documents)</span>
            </label>
            <textarea
              id="p-assurance"
              className="field"
              placeholder="Ex : Assurance responsabilité civile professionnelle n° 123456 souscrite auprès de [Assureur], couvrant la France métropolitaine."
              value={assurancePro}
              onChange={(e) => setAssurancePro(e.target.value)}
            />
            <p className="champ-aide">Obligatoire sur les devis et factures pour les métiers du bâtiment (assurance décennale).</p>
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
        </FicheRubrique>

        <FicheRubrique
          etat="neutre"
          icone={ICONES.numerotation}
          titre="Numérotation"
          resume={`Prochain devis n°${prochainNumeroDevis} · facture n°${prochainNumeroFacture}`}
          pastille="Auto"
        >
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
        </FicheRubrique>
      </details>

      <button className="btn btn-primary btn-bloc" onClick={enregistrer}>
        Enregistrer
      </button>

      {message && <p className="message" style={{ textAlign: "center" }}>{message}</p>}
    </main>
  );
}

