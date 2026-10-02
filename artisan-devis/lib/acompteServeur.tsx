import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminSupabase } from "@/lib/supabaseServerClient";
import { DevisPDF } from "@/lib/devisPdf";
import { nomAffichageDocument, mentionSociete, nomCourt } from "@/lib/nomAffichage";
import { acompteNormalise, pdfAcompte, totalTTCDevis } from "@/lib/acompte";
import {
  blocAutresMoyens,
  echapperHtml,
  emailClientHtml,
  expediteur,
  formaterEuros,
  logoInline,
  nomFichierPdf,
  signatureArtisan,
  totauxTicket,
} from "@/lib/emailTemplate";

// Facture d'acompte cote serveur (supabase/acompte.sql), partagee par
// « Demander un acompte » (/api/acompte/[id]) et par la signature du client
// (/api/upload-signature), qui la cree toute seule quand les conditions de
// paiement de l'artisan annoncent un acompte.

const resend = new Resend(process.env.RESEND_API_KEY);
type Supabase = ReturnType<typeof createAdminSupabase>;

// Numerote et enregistre l'acompte sur la ligne du devis. `devis` est mis a
// jour en place (champs acompte_*) pour l'envoi qui suit.
export async function creerAcompte(
  supabase: Supabase,
  devis: any,
  tauxTva: number,
  montantSaisi: number,
  pourcentageSaisi: number | null
): Promise<{ numero: number } | { erreur: string; statut: number }> {
  if (devis.est_facture || devis.statut !== "signe") {
    return { erreur: "Un acompte se demande sur un devis signé", statut: 400 };
  }
  if (devis.acompte_numero) {
    return { erreur: `Un acompte a déjà été demandé (facture n°${devis.acompte_numero})`, statut: 400 };
  }

  const totalTTC = totalTTCDevis(devis.total, tauxTva);
  const { ttc: montant } = acompteNormalise(montantSaisi, tauxTva);
  if (!(montant > 0) || montant >= totalTTC) {
    return { erreur: `L'acompte doit être compris entre 0 et ${formaterEuros(totalTTC)}`, statut: 400 };
  }
  const pourcentage = pourcentageSaisi && pourcentageSaisi > 0 && pourcentageSaisi < 100 ? pourcentageSaisi : null;

  // Meme suite de numeros que les factures : une facture d'acompte est une facture.
  const { data: numero, error: erreurNumero } = await supabase.rpc("numero_facture_suivant", {
    p_artisan_id: devis.artisan_id,
  });
  if (erreurNumero || !numero) {
    return { erreur: "Numérotation de l'acompte impossible : " + (erreurNumero?.message || ""), statut: 500 };
  }

  const maj = {
    acompte_numero: numero,
    acompte_montant: montant,
    acompte_pourcentage: pourcentage,
    acompte_cree_le: new Date().toISOString(),
  };
  const { error: erreurMaj } = await supabase.from("devis").update(maj).eq("id", devis.id).is("acompte_numero", null);
  if (erreurMaj) {
    return { erreur: erreurMaj.message, statut: 500 };
  }
  Object.assign(devis, maj);
  return { numero };
}

// Envoie la facture d'acompte (PDF + bouton de paiement) au client.
export async function envoyerAcompte({
  devis,
  profil,
  emailArtisan,
  origin,
}: {
  devis: any;
  profil: any;
  emailArtisan: string | null | undefined;
  origin: string;
}): Promise<{ envoye: boolean; erreurEnvoi?: string }> {
  if (!devis.client_email) return { envoye: false };

  const tauxTva = Number(profil?.taux_tva ?? 20);
  const numero = devis.acompte_numero as number;
  const acompte = pdfAcompte(devis, tauxTva);
  const { ht } = acompteNormalise(Number(devis.acompte_montant) || 0, tauxTva);

  try {
    const pdfBuffer = await renderToBuffer(
      <DevisPDF
        entreprise={{
          nom: nomAffichageDocument(profil),
          mentionSociete: mentionSociete(profil),
          telephone: profil?.telephone,
          adresse: profil?.adresse,
          codePostal: profil?.code_postal,
          ville: profil?.ville,
          logoUrl: profil?.logo_url,
          siret: profil?.siret,
          numeroTva: profil?.numero_tva,
          iban: profil?.iban,
          bic: profil?.bic,
          titulaireCompte: profil?.titulaire_compte,
          moyensPaiement: profil?.moyens_paiement,
          conditionsPaiement: profil?.conditions_paiement,
          assurancePro: profil?.assurance_pro,
          mediateurConso: profil?.mediateur_conso,
          penalitesRetard: profil?.penalites_retard,
        }}
        clientNom={devis.client_nom || ""}
        clientAdresse={devis.client_adresse}
        clientTelephone={devis.client_telephone}
        clientSiren={devis.client_siren}
        clientType={devis.client_type}
        adressePrestation={devis.adresse_prestation}
        lignes={acompte.lignes}
        tauxTva={tauxTva}
        date={acompte.date}
        type="acompte"
        numero={numero}
        acompteSur={acompte.acompteSur}
        paiement={acompte.paiement}
      />
    );

    const nomArtisan = nomAffichageDocument(profil);
    const dejaPaye = Boolean(devis.acompte_payee_le);
    const enLigne = Boolean(profil?.stripe_paiement_actif) && !dejaPaye;
    const totaux = totauxTicket(ht, tauxTva);

    const { error: erreurResend } = await resend.emails.send({
      from: expediteur(nomCourt(profil)),
      replyTo: emailArtisan || undefined,
      to: devis.client_email,
      bcc: profil?.copie_envois && emailArtisan ? emailArtisan : undefined,
      subject: `Facture d'acompte n°${numero}${nomArtisan ? ` – ${nomArtisan}` : ""}`,
      html: emailClientHtml({
        nomArtisan: nomArtisan || "Facture d'acompte",
        etiquette: `Facture d'acompte n°${numero}`,
        corpsHtml: `
          <p style="margin:0 0 10px;">Bonjour${devis.client_nom ? ` ${echapperHtml(devis.client_nom)}` : ""},</p>
          <p style="margin:0;">Merci d'avoir signé le devis${devis.numero_devis ? ` n°${devis.numero_devis}` : ""} ! Voici la facture d'acompte qui permet de lancer la prestation. Le solde vous sera facturé à la fin de la prestation.</p>
        `,
        ticket: {
          lignes: [{ libelle: acompte.lignes[0].description, montant: "" }],
          ...totaux,
          note: dejaPaye ? "Acompte déjà réglé · merci !" : "Facture d'acompte jointe en PDF",
        },
        boutonUrl: enLigne ? `${origin}/signer/${devis.id}` : null,
        boutonTexte: `Payer l'acompte de ${totaux.total} en ligne`,
        sousBouton: "Carte bancaire, Apple Pay ou Google Pay · paiement sécurisé",
        apresBoutonHtml: dejaPaye ? "" : blocAutresMoyens({ enLigne, profil, numero }),
        signature: signatureArtisan(profil, nomArtisan),
      }),
      attachments: [
        ...(await logoInline()),
        {
          filename: nomFichierPdf("Facture-acompte", numero, nomArtisan),
          content: pdfBuffer,
        },
      ],
    });

    // L'acompte existe bien dans tous les cas : seul l'email peut manquer.
    return erreurResend ? { envoye: false, erreurEnvoi: erreurResend.message } : { envoye: true };
  } catch (e: any) {
    return { envoye: false, erreurEnvoi: e.message };
  }
}
