import { EnteteLegale } from "@/components/EnteteLegale";

export const metadata = { title: "Confidentialité & cookies — VolpeVox" };

export default function Confidentialite() {
  return (
    <main className="page-shell page-shell--large">
      <EnteteLegale />
      <h1 className="page-title">Confidentialité &amp; cookies</h1>

      <div className="card prose-legale">
        <p>
          <em>Dernière mise à jour : 25 août 2026</em>
        </p>

        <h2>1. Responsable du traitement</h2>
        <p>
          Le responsable du traitement des données à caractère personnel collectées par VolpeVox est Malcom Marley
          RENAR (voir <a href="/mentions-legales">mentions légales</a>), joignable à volpevox@outlook.fr pour toute
          question relative à vos données.
        </p>

        <h2>2. Données collectées</h2>
        <ul>
          <li>
            <strong>Données de l'artisan (utilisateur du compte)</strong> : identité, email, téléphone, adresse,
            SIRET, numéro de TVA, IBAN (facultatif), logo ;
          </li>
          <li>
            <strong>Données des clients de l'artisan</strong> (saisies par l'artisan dans ses devis et factures) :
            nom, email, adresse, signature électronique. L'artisan est responsable, vis-à-vis de ses propres clients,
            de la licéité de cette collecte ; VolpeVox agit en tant que sous-traitant pour ces données ;
          </li>
          <li>
            <strong>Enregistrements vocaux</strong> réalisés par l'artisan lors de la dictée d'un chantier, transmis
            de façon sécurisée à OpenAI pour transcription et structuration automatique du devis ;
          </li>
          <li>
            <strong>Données de paiement</strong> : traitées directement par Stripe ; VolpeVox n'a jamais accès aux
            numéros de carte bancaire.
          </li>
        </ul>

        <h2>3. Finalités</h2>
        <p>
          Ces données sont traitées pour permettre la création de compte, la génération des devis et factures, la
          signature électronique, l'envoi des documents et relances par email, la gestion de l'abonnement et le
          paiement en ligne des factures.
        </p>

        <h2>4. Base légale</h2>
        <p>
          Les traitements sont fondés sur l'exécution du contrat liant l'artisan à VolpeVox (fourniture du service
          souscrit).
        </p>

        <h2>5. Destinataires et sous-traitants</h2>
        <p>Les données peuvent être transmises aux prestataires techniques suivants, dans la stricte mesure nécessaire au fonctionnement du service :</p>
        <ul>
          <li><strong>Supabase</strong> (base de données, hébergée à Frankfurt, Union européenne) ;</li>
          <li><strong>Vercel</strong> (hébergement de l'application, États-Unis) ;</li>
          <li><strong>OpenAI</strong> (transcription vocale Whisper et structuration du devis par IA, États-Unis) ;</li>
          <li><strong>Resend</strong> (envoi des emails) ;</li>
          <li><strong>Stripe</strong> (paiement de l'abonnement et paiement en ligne des factures des clients de l'artisan).</li>
        </ul>
        <p>
          Certains de ces prestataires sont situés hors de l'Union européenne (États-Unis) ; ils s'appuient sur des
          mécanismes de conformité reconnus par le RGPD (clauses contractuelles types ou équivalent) pour encadrer ces
          transferts.
        </p>

        <h2>6. Durée de conservation</h2>
        <p>
          Les données sont conservées pendant toute la durée de l'abonnement, puis archivées ou supprimées dans un
          délai raisonnable après la clôture du compte, sous réserve des durées de conservation imposées par la
          réglementation comptable et fiscale applicable aux devis et factures.
        </p>

        <h2>7. Sécurité</h2>
        <p>
          VolpeVox met en œuvre des mesures techniques raisonnables (connexion sécurisée, accès protégé par mot de
          passe) pour protéger les données contre l'accès non autorisé, la perte ou l'altération.
        </p>

        <h2>8. Vos droits</h2>
        <p>
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, d'opposition et de
          portabilité sur vos données, ainsi que du droit d'introduire une réclamation auprès de la CNIL
          (cnil.fr). Pour exercer ces droits, contactez volpevox@outlook.fr.
        </p>

        <h2>9. Cookies et stockage local</h2>
        <p>
          VolpeVox n'utilise aucun cookie publicitaire ni traceur de mesure d'audience. L'application utilise
          uniquement un stockage local sur votre appareil (localStorage), strictement nécessaire pour maintenir votre
          connexion d'une visite à l'autre. Ce stockage technique, indispensable au fonctionnement du service, ne
          nécessite pas de recueil de consentement préalable au titre de la réglementation « cookies ».
        </p>

        <div className="liens-legaux">
          <a href="/mentions-legales">Mentions légales</a>
          <a href="/cgu">Conditions générales d'utilisation</a>
          <a href="/cgv">Conditions générales de vente</a>
        </div>
      </div>
    </main>
  );
}
