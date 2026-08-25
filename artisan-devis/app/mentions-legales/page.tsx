import { EnteteLegale } from "@/components/EnteteLegale";

export const metadata = { title: "Mentions légales — VolpeVox" };

export default function MentionsLegales() {
  return (
    <main className="page-shell page-shell--large">
      <EnteteLegale />
      <h1 className="page-title">Mentions légales</h1>

      <div className="card prose-legale">
        <h2>Éditeur</h2>
        <p>
          L'application et le site VolpeVox sont édités par :<br />
          <strong>Malcom Marley RENAR</strong>, entrepreneur individuel (micro-entreprise)
          <br />
          SIRET : 891 922 940 00020
          <br />
          Adresse : Domaine de la Confina 2, 20090 Ajaccio, France
          <br />
          Email de contact : volpevox@outlook.fr
        </p>

        <h2>Directeur de la publication</h2>
        <p>Malcom Marley RENAR</p>

        <h2>Hébergement</h2>
        <ul>
          <li>
            <strong>Application web</strong> : Vercel Inc. — 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis —{" "}
            vercel.com
          </li>
          <li>
            <strong>Base de données</strong> : Supabase Inc., infrastructure hébergée en Europe (Frankfurt, Allemagne)
            — supabase.com
          </li>
          <li>
            <strong>Envoi des emails</strong> : Resend — resend.com
          </li>
        </ul>

        <h2>Propriété intellectuelle</h2>
        <p>
          L'ensemble des éléments de VolpeVox (marque, logo, textes, interface, code source) est la propriété
          exclusive de l'éditeur, sauf mention contraire. Toute reproduction ou représentation, totale ou partielle,
          sans autorisation préalable est interdite.
        </p>

        <h2>Responsabilité</h2>
        <p>
          L'éditeur met tout en œuvre pour assurer l'exactitude des informations diffusées sur VolpeVox, mais ne
          peut garantir l'absence totale d'erreur ou d'interruption de service. Chaque utilisateur reste responsable
          de l'exactitude des informations qu'il saisit et des documents (devis, factures) qu'il génère et transmet
          à ses propres clients.
        </p>

        <h2>Droit applicable</h2>
        <p>
          Les présentes mentions légales sont soumises au droit français. En cas de litige, et à défaut de résolution
          amiable, les tribunaux du ressort d'Ajaccio seront seuls compétents.
        </p>

        <div className="liens-legaux">
          <a href="/cgu">Conditions générales d'utilisation</a>
          <a href="/cgv">Conditions générales de vente</a>
          <a href="/confidentialite">Confidentialité &amp; cookies</a>
        </div>
      </div>
    </main>
  );
}
