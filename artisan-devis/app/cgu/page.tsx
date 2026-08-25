import { EnteteLegale } from "@/components/EnteteLegale";

export const metadata = { title: "Conditions générales d'utilisation — VolpeVox" };

export default function Cgu() {
  return (
    <main className="page-shell page-shell--large">
      <EnteteLegale />
      <h1 className="page-title">Conditions générales d'utilisation</h1>

      <div className="card prose-legale">
        <p>
          <em>Dernière mise à jour : 25 août 2026</em>
        </p>

        <h2>1. Objet</h2>
        <p>
          VolpeVox est un service édité par Malcom Marley RENAR (voir{" "}
          <a href="/mentions-legales">mentions légales</a>) permettant à un artisan ou prestataire de créer un devis
          par dictée vocale, de le faire signer électroniquement par son client, de le transformer en facture, puis
          d'encaisser son paiement en ligne. Les présentes conditions générales d'utilisation (CGU) régissent l'accès
          et l'usage du service par l'utilisateur professionnel (ci-après « l'artisan »).
        </p>

        <h2>2. Acceptation</h2>
        <p>
          La création d'un compte VolpeVox implique l'acceptation pleine et entière des présentes CGU, ainsi que des{" "}
          <a href="/cgv">conditions générales de vente</a> et de la{" "}
          <a href="/confidentialite">politique de confidentialité</a>.
        </p>

        <h2>3. Accès au service et compte</h2>
        <p>
          VolpeVox est réservé aux professionnels (artisans, prestataires) agissant dans le cadre de leur activité.
          L'artisan est responsable de la confidentialité de ses identifiants et de toute activité effectuée depuis
          son compte. Il s'engage à fournir des informations exactes (identité, SIRET, coordonnées) et à les tenir à
          jour, notamment via la page « Profil ».
        </p>

        <h2>4. Description du service</h2>
        <p>Le service permet notamment :</p>
        <ul>
          <li>la dictée vocale d'un chantier, transcrite et structurée automatiquement par intelligence artificielle en devis ;</li>
          <li>la génération de documents PDF (devis, factures) ;</li>
          <li>la signature électronique du devis par le client de l'artisan ;</li>
          <li>la transformation du devis signé en facture ;</li>
          <li>l'envoi de ces documents par email et les relances automatiques ;</li>
          <li>le paiement en ligne des factures par les clients de l'artisan, via Stripe.</li>
        </ul>

        <h2>5. Obligations de l'artisan</h2>
        <p>
          L'artisan est seul responsable du contenu des devis et factures qu'il génère et envoie via VolpeVox
          (exactitude des prix, mentions légales et fiscales obligatoires, conformité à la réglementation applicable
          à son activité et à son statut). VolpeVox est un outil d'assistance à la rédaction et ne se substitue pas à
          un conseil juridique, comptable ou fiscal. L'artisan s'engage également à respecter la réglementation
          applicable à la collecte des données de ses propres clients (voir <a href="/confidentialite">politique de
          confidentialité</a>).
        </p>

        <h2>6. Disponibilité du service</h2>
        <p>
          VolpeVox s'efforce d'assurer un accès continu au service, sans garantie de disponibilité permanente. Des
          interruptions peuvent survenir pour maintenance, mise à jour, ou pour des causes indépendantes de sa
          volonté (panne d'un prestataire tiers : hébergement, transcription vocale, envoi d'emails, paiement).
        </p>

        <h2>7. Propriété intellectuelle</h2>
        <p>
          VolpeVox reste propriétaire de l'application, de sa marque et de son code. L'artisan reste propriétaire des
          contenus qu'il crée (devis, factures, informations de ses clients).
        </p>

        <h2>8. Suspension et résiliation</h2>
        <p>
          En cas de manquement grave aux présentes CGU, d'usage frauduleux ou de non-paiement de l'abonnement,
          VolpeVox se réserve le droit de suspendre ou résilier l'accès au compte, après information de l'artisan
          lorsque cela est possible.
        </p>

        <h2>9. Responsabilité</h2>
        <p>
          VolpeVox ne saurait être tenu responsable des conséquences d'une utilisation non conforme du service, d'une
          erreur de saisie de l'artisan, ou d'un différend entre l'artisan et son propre client. La responsabilité de
          VolpeVox, si elle devait être engagée, est limitée aux sommes versées par l'artisan au titre de son
          abonnement au cours des douze derniers mois.
        </p>

        <h2>10. Modification des CGU</h2>
        <p>
          VolpeVox peut modifier les présentes CGU à tout moment, notamment pour tenir compte d'évolutions légales ou
          du service. La version applicable est celle publiée sur cette page.
        </p>

        <h2>11. Droit applicable</h2>
        <p>Les présentes CGU sont soumises au droit français.</p>

        <div className="liens-legaux">
          <a href="/mentions-legales">Mentions légales</a>
          <a href="/cgv">Conditions générales de vente</a>
          <a href="/confidentialite">Confidentialité &amp; cookies</a>
        </div>
      </div>
    </main>
  );
}
