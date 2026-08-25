import { EnteteLegale } from "@/components/EnteteLegale";

export const metadata = { title: "Conditions générales de vente — VolpeVox" };

export default function Cgv() {
  return (
    <main className="page-shell page-shell--large">
      <EnteteLegale />
      <h1 className="page-title">Conditions générales de vente</h1>

      <div className="card prose-legale">
        <p>
          <em>Dernière mise à jour : 25 août 2026</em>
        </p>

        <h2>1. Objet</h2>
        <p>
          Les présentes conditions générales de vente (CGV) régissent l'abonnement au service VolpeVox, souscrit par
          un artisan ou prestataire professionnel (ci-après « l'artisan ») auprès de Malcom Marley RENAR (voir{" "}
          <a href="/mentions-legales">mentions légales</a>). VolpeVox est un service à destination exclusive des
          professionnels ; les présentes CGV ne relèvent donc pas du droit de la consommation.
        </p>

        <h2>2. Prix et abonnement</h2>
        <p>
          L'accès à VolpeVox est proposé sous forme d'un abonnement mensuel au tarif affiché sur la page « Mon
          abonnement » de l'application (79 € par mois au lancement, toutes taxes comprises selon le régime fiscal en
          vigueur), précédé d'une période d'essai gratuite de 14 jours sans engagement. Une offre découverte réservée
          aux 20 premiers artisans inscrits permet de bénéficier d'un tarif de 45 € par mois pendant les 12 premiers
          mois d'abonnement, avant de basculer automatiquement au tarif standard de 79 € par mois.
        </p>

        <h2>3. Modalités de paiement</h2>
        <p>
          La carte bancaire de l'artisan est enregistrée dès l'inscription, via la plateforme de paiement Stripe :
          aucun prélèvement n'intervient avant la fin de la période d'essai gratuite de 14 jours. Passé ce délai, le
          paiement de l'abonnement est prélevé automatiquement chaque mois par carte bancaire, sauf résiliation avant
          la fin de l'essai. VolpeVox ne stocke à aucun moment les coordonnées bancaires de l'artisan.
        </p>

        <h2>4. Durée et résiliation</h2>
        <p>
          L'abonnement est sans engagement de durée et se renouvelle automatiquement chaque mois, sauf résiliation.
          L'artisan peut résilier son abonnement à tout moment en contactant directement l'éditeur (WhatsApp ou email
          indiqués dans la page « Mon abonnement »). La résiliation prend effet à la fin de la période mensuelle déjà
          payée ; aucun remboursement au prorata n'est effectué pour un mois entamé, sauf décision contraire de
          l'éditeur.
        </p>

        <h2>5. Défaut de paiement</h2>
        <p>
          En cas d'échec de prélèvement, l'accès au service pourra être suspendu jusqu'à régularisation, après
          tentative d'information de l'artisan.
        </p>

        <h2>6. Absence de droit de rétractation</h2>
        <p>
          VolpeVox étant un service souscrit par un professionnel pour les besoins de son activité, le droit de
          rétractation prévu par le Code de la consommation ne s'applique pas. La période d'essai gratuite de 21
          jours permet néanmoins de tester le service sans engagement et sans aucun prélèvement avant son terme,
          même si une carte bancaire est enregistrée dès l'inscription.
        </p>

        <h2>7. Facturation</h2>
        <p>L'artisan reçoit une facture de son abonnement VolpeVox à chaque prélèvement, via Stripe.</p>

        <h2>8. Paiements encaissés par l'artisan auprès de ses propres clients</h2>
        <p>
          VolpeVox permet à l'artisan de proposer à ses propres clients un paiement en ligne de leurs factures, via
          Stripe Connect. Dans ce cadre, VolpeVox agit uniquement en tant que fournisseur technique de la solution de
          paiement et n'est pas partie à la relation commerciale entre l'artisan et son client. VolpeVox ne prélève
          aucune commission sur ces paiements ; les fonds sont directement versés à l'artisan par Stripe, seul
          responsable, avec l'artisan, du bon déroulement de cette transaction au regard des conditions d'utilisation
          de Stripe.
        </p>

        <h2>9. Responsabilité</h2>
        <p>
          La responsabilité de VolpeVox, si elle devait être engagée au titre des présentes CGV, est limitée aux
          sommes effectivement versées par l'artisan au titre de son abonnement au cours des douze derniers mois.
        </p>

        <h2>10. Modification des CGV</h2>
        <p>
          VolpeVox peut modifier les présentes CGV, notamment en cas d'évolution tarifaire. L'artisan en sera informé
          préalablement ; la poursuite de l'utilisation du service après cette information vaut acceptation des
          nouvelles conditions.
        </p>

        <h2>11. Droit applicable</h2>
        <p>
          Les présentes CGV sont soumises au droit français. En cas de litige, et à défaut de résolution amiable, les
          tribunaux du ressort d'Ajaccio seront seuls compétents.
        </p>

        <div className="liens-legaux">
          <a href="/mentions-legales">Mentions légales</a>
          <a href="/cgu">Conditions générales d'utilisation</a>
          <a href="/confidentialite">Confidentialité &amp; cookies</a>
        </div>
      </div>
    </main>
  );
}
