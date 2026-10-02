import Link from "next/link";
import type { ReactNode } from "react";
import { Topbar } from "@/components/Topbar";

// Guide « Comment ça marche », dans l'identite des cartes « ticket » :
// le parcours en chapitres (demarrer, devis, facture, suivi) puis la
// reforme de la facturation electronique. Accessible meme avec un profil
// incomplet (voir PAGES_TOUJOURS_ACCESSIBLES dans lib/useArtisan.ts).

function Etape({
  n,
  titre,
  derniere,
  demo,
  children,
}: {
  n: number;
  titre: string;
  derniere?: boolean;
  demo?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="ccm-etape">
      <div className="ccm-numero-col">
        <span className="ccm-numero">{n}</span>
        {derniere ? null : <span className="ccm-ligne-verticale" />}
      </div>
      <div className="ccm-etape-corps">
        <p className="ccm-etape-titre">{titre}</p>
        <p className="ccm-etape-texte">{children}</p>
        {demo ? <div className="ccm-demo">{demo}</div> : null}
      </div>
    </div>
  );
}

function Chapitre({
  etiquette,
  titre,
  etat,
  children,
}: {
  etiquette: string;
  titre: string;
  etat?: "ok" | "neutre";
  children: ReactNode;
}) {
  return (
    <section className={`fiche ccm-chapitre${etat === "ok" ? " fiche--ok" : etat === "neutre" ? " fiche--neutre" : ""}`}>
      <p className="ccm-chapitre-etiquette">{etiquette}</p>
      <h2 className="ccm-chapitre-titre">{titre}</h2>
      <div className="ccm-timeline">{children}</div>
    </section>
  );
}

const coche = (
  <span className="ccm-check">
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" pathLength={1} style={{ strokeDasharray: 1 }} />
      <path
        d="M8 12.5 11 15.5 16 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        style={{ strokeDasharray: 1 }}
      />
    </svg>
  </span>
);

const cloche = (
  <div className="ccm-cloche" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3a5 5 0 0 0-5 5v3.2c0 .5-.2 1-.5 1.4L5 15h14l-1.5-2.4a2 2 0 0 1-.5-1.4V8a5 5 0 0 0-5-5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
    <span className="ccm-point-relance" />
  </div>
);

export default function CommentCaMarche() {
  return (
    <main className="page-shell">
      <Topbar />

      <h1 className="page-title">Comment ça marche</h1>

      {/* En tete : le parcours d'un document, comme sur les cartes Devis / Factures */}
      <div className="fiche ccm-entete">
        <p className="ccm-entete-titre">De ta voix au paiement</p>
        <p className="ccm-entete-texte">Tu parles, VolpeVox s'occupe de la paperasse. Chaque étape prend quelques secondes.</p>
        <div className="carte-doc-parcours" style={{ marginBottom: 0 }}>
          <span className="carte-doc-parcours-fait" style={{ width: "76%" }} />
          <div className="carte-doc-etape fait">Dicté</div>
          <div className="carte-doc-etape fait">Signé</div>
          <div className="carte-doc-etape fait">Facturé</div>
          <div className="carte-doc-etape fait">Réglé</div>
        </div>
      </div>

      <Chapitre etiquette="Une seule fois" titre="Tu démarres">
        <Etape
          n={1}
          titre="Tes infos en une minute"
          derniere
          demo={
            <div className="ccm-paiement" aria-hidden="true">
              <span className="ccm-profil-icone">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="9" cy="11" r="2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M13 10.5h5M13 13h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              {coche}
            </div>
          }
        >
          Tape ton SIRET ou le nom de ton entreprise : ton adresse se remplit toute seule depuis l'annuaire officiel.
          Tu ajoutes ton téléphone, tu dis si tu factures la TVA, et c'est prêt. Dans « Mon compte », le bouton « Voir
          un exemple de devis » te montre ce que recevront tes clients.
        </Etape>
      </Chapitre>

      <Chapitre etiquette="Le devis" titre="Tu dictes, il se remplit">
        <Etape
          n={2}
          titre="Tu dictes ta prestation"
          demo={
            <>
              <div className="ccm-mic-mini">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div className="ccm-wave-mini" aria-hidden="true">
                {[0.4, 0.9, 0.55, 1, 0.35, 0.75, 0.5].map((amp, i) => (
                  <span key={i} style={{ ["--amp" as any]: amp, animationDelay: `${i * 0.08}s` }} />
                ))}
              </div>
            </>
          }
        >
          Appuie sur le micro et raconte : le client, ce que tu fais, les quantités, ton prix. Comme si tu l'expliquais à
          un collègue, sans rien taper.
        </Etape>
        <Etape
          n={3}
          titre="Le devis se remplit tout seul"
          demo={
            <div className="ccm-lignes" aria-hidden="true">
              <span className="ccm-ligne-texte" style={{ width: "95%", animationDelay: "0s" }} />
              <span className="ccm-ligne-texte" style={{ width: "78%", animationDelay: "0.3s" }} />
              <span className="ccm-ligne-texte" style={{ width: "55%", animationDelay: "0.6s" }} />
            </div>
          }
        >
          L'IA remplit le client, les lignes, les prix et le total. Tu vois un résumé clair : touche une ligne pour la
          corriger. Un client déjà connu est reconnu, et tes prix habituels sont repris d'un devis à l'autre.
        </Etape>
        <Etape n={4} titre="Tu vérifies et tu envoies">
          Aperçu du PDF à ton nom (pince pour zoomer), puis envoi par email en un clic. Le client reçoit un devis
          propre, avec ton logo et toutes les mentions obligatoires.
        </Etape>
        <Etape
          n={5}
          titre="Le client signe sur son téléphone"
          demo={
            <div className="ccm-telephone" aria-hidden="true">
              <svg viewBox="0 0 120 40" width="44" height="15">
                <path
                  d="M6 28 C 18 6, 28 40, 40 18 S 62 4, 74 22 S 96 34, 114 12"
                  stroke="var(--ink)"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  pathLength={1}
                  style={{ strokeDasharray: 1 }}
                />
              </svg>
            </div>
          }
        >
          Il ouvre le lien reçu et signe avec son doigt. Pas d'impression, pas de scan, pas de déplacement.
        </Etape>
        <Etape n={6} titre="Tu es prévenu, il est relancé" derniere demo={cloche}>
          Une notification t'avertit dès que le devis est signé. Sans réponse, une relance polie part toute seule à
          J+3 puis J+7.
        </Etape>
      </Chapitre>

      <Chapitre etiquette="La facture" titre="Tu factures, il paie">
        <Etape
          n={7}
          titre="Le devis devient une facture"
          demo={
            <div className="ccm-transform" aria-hidden="true">
              <span className="ccm-mini-doc">DEVIS</span>
              <svg className="ccm-fleche-icone" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="ccm-mini-doc ccm-mini-doc--facture">FACTURE</span>
            </div>
          }
        >
          Prestation terminée : « Transformer en facture », tu indiques la date de la prestation, c'est numéroté
          automatiquement. Tout s'est dit à l'oral ? Dicte directement une facture avec l'interrupteur
          Devis / Facture.
        </Etape>
        <Etape
          n={8}
          titre="Le client paie en ligne"
          demo={
            <div className="ccm-paiement" aria-hidden="true">
              <span className="ccm-euro">€</span>
              {coche}
            </div>
          }
        >
          Connecte une fois ton compte Stripe (Paramètres → Paiement en ligne) : chaque facture a son bouton de
          paiement, par carte ou Apple Pay, et l'argent arrive sur ton compte, sans commission VolpeVox. Sinon, virement,
          chèque ou espèces : tu la marques payée en un geste.
        </Etape>
        <Etape n={9} titre="Relance si la facture traîne">
          Facture impayée ? Relance automatique, comme pour les devis. Tu n'as plus à courir après ton argent.
        </Etape>
        <Etape n={10} titre="Une erreur ? L'avoir" derniere>
          Une facture envoyée ne se supprime pas, c'est la loi. Menu « ··· » → « Annuler par un avoir » : un avoir
          numéroté est créé et envoyé au client, ta numérotation reste propre.
        </Etape>
      </Chapitre>

      <Chapitre etiquette="Au quotidien" titre="Tout est suivi" etat="ok">
        <Etape n={11} titre="Tes devis et factures d'un coup d'œil">
          Chaque carte montre où en est le document (envoyé, signé, facturé, réglé). En haut des Factures : ce qui
          reste à encaisser et ce que tu as encaissé ce mois-ci.
        </Etape>
        <Etape n={12} titre="Range et transmets" derniere>
          Archive les factures réglées pour garder ta liste légère (elles restent conservées). Pour ton comptable :
          Paramètres → Export comptable.
        </Etape>
      </Chapitre>

      {/* Reforme de la facturation electronique : ne jamais annoncer VolpeVox
          « conforme » ou « agree » tant que la plateforme agreee n'est pas
          branchee en production (voir memoire facturation electronique). */}
      <section className="fiche fiche--neutre ccm-chapitre ccm-reforme">
        <p className="ccm-chapitre-etiquette">
          <span className="pastille-etat">À venir · septembre 2027</span>
        </p>
        <h2 className="ccm-chapitre-titre">La facture électronique arrive</h2>
        <p className="ccm-reforme-texte">
          L'État généralise la facture électronique pour lutter contre la fraude à la TVA. Voici ce qui change pour
          toi, simplement.
        </p>

        <div className="ccm-reforme-dates">
          <div>
            <strong>Sept. 2026</strong>
            <span>Toutes les entreprises doivent pouvoir <b>recevoir</b> des factures électroniques.</span>
          </div>
          <div>
            <strong>Sept. 2027</strong>
            <span>
              Les artisans, TPE et micro-entrepreneurs doivent <b>émettre</b> leurs factures en électronique.
            </span>
          </div>
        </div>

        <div className="ccm-reforme-cas">
          <div>
            <p className="ccm-reforme-cas-titre">Ton client est une entreprise</p>
            <p className="ccm-etape-texte">
              Le PDF envoyé par email ne suffira plus : la facture devra partir dans un format électronique, via une
              plateforme agréée par l'État.
            </p>
          </div>
          <div>
            <p className="ccm-reforme-cas-titre">Ton client est un particulier</p>
            <p className="ccm-etape-texte">
              Tu gardes ta facture PDF, mais les montants de tes ventes devront être transmis au fisc (le
              « e-reporting »).
            </p>
          </div>
        </div>

        <p className="ccm-reforme-cas-titre" style={{ marginTop: 16 }}>
          Ce que fait VolpeVox
        </p>
        <ul className="ccm-reforme-liste">
          <li>
            <b className="vert">✓ Déjà fait</b> : les nouvelles mentions obligatoires sont sur tes factures (SIREN de
            ton client pro, « Opération : prestation de services »).
          </li>
          <li>
            <b>En préparation</b> : l'envoi de tes factures par une plateforme agréée, pour que tu continues à
            travailler exactement comme aujourd'hui.
          </li>
          <li>
            <b>Tu seras prévenu</b> bien avant l'échéance, avec la marche à suivre.
          </li>
        </ul>
      </section>

      <Link href="/" className="btn btn-primary btn-bloc" style={{ marginTop: 8 }}>
        Faire un devis maintenant →
      </Link>
      <p className="hint" style={{ textAlign: "center", margin: "12px 0 24px" }}>
        Une question ? Écris-moi sur WhatsApp depuis l'accueil, je réponds vite.
      </p>
    </main>
  );
}
