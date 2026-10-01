import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminSupabase, getArtisanConnecte } from "@/lib/supabaseServerClient";
import { DevisPDF } from "@/lib/devisPdf";
import { nomAffichageDocument, mentionSociete } from "@/lib/nomAffichage";
import {
  emailClientHtml,
  echapperHtml,
  expediteur,
  lignesTicket,
  logoInline,
  nomFichierPdf,
  signatureArtisan,
  totauxTicket,
} from "@/lib/emailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const resultat = await getArtisanConnecte(req.headers.get("authorization"));
  if ("erreur" in resultat) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: resultat.statut });
  }
  const { artisan, email: emailArtisan } = resultat;

  const supabase = createAdminSupabase();
  const { data: devis } = await supabase.from("devis").select("*").eq("id", params.id).maybeSingle();

  if (!devis) {
    return NextResponse.json({ erreur: "Devis introuvable" }, { status: 404 });
  }

  if (devis.artisan_id !== artisan.id) {
    return NextResponse.json({ erreur: "Ce devis ne t'appartient pas" }, { status: 403 });
  }

  if (!devis.est_facture) {
    return NextResponse.json({ erreur: "Ce devis n'a pas encore été transformé en facture" }, { status: 400 });
  }

  if (devis.avoir_numero) {
    return NextResponse.json({ erreur: "Cette facture est annulée par un avoir" }, { status: 400 });
  }

  if (!devis.client_email) {
    return NextResponse.json({ erreur: "Aucun email de client enregistré sur ce devis" }, { status: 400 });
  }

  const { data: lignes } = await supabase
    .from("lignes_devis")
    .select("*")
    .eq("devis_id", params.id)
    .order("ordre", { ascending: true });

  const { data: profil } = await supabase
    .from("artisans")
    .select("*")
    .eq("id", devis.artisan_id)
    .maybeSingle();

  const tauxTva = profil?.taux_tva ?? 20;
  const totalHT = devis.total ?? 0;
  const montantTva = (totalHT * tauxTva) / 100;
  const totalTTC = totalHT + montantTva;

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
          conditionsPaiement: profil?.conditions_paiement,
          assurancePro: profil?.assurance_pro,
          mediateurConso: profil?.mediateur_conso,
          penalitesRetard: profil?.penalites_retard,
        }}
        clientNom={devis.client_nom || ""}
        clientAdresse={devis.client_adresse}
        clientTelephone={devis.client_telephone}
        clientSiren={devis.client_siren}
        lignes={(lignes || []).map((l) => ({
          description: l.description || "",
          quantite: l.quantite || 1,
          unite: l.unite || "forfait",
          prixUnitaire: l.prix_unitaire || 0,
        }))}
        tauxTva={tauxTva}
        date={new Date(devis.facture_creee_le)}
        type="facture"
        numero={devis.numero_facture}
        paiement={{
          payeeLe: devis.payee_le ? new Date(devis.payee_le) : null,
          moyenPaiement: devis.moyen_paiement || null,
        }}
        datePrestation={devis.date_prestation ? new Date(devis.date_prestation) : null}
      />
    );

    const lienSuivi = `${req.nextUrl.origin}/signer/${params.id}`;

    const nomArtisan = nomAffichageDocument(profil);
    const numero = devis.numero_facture;
    const dateFr = (d: string) => new Date(d).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
    // Facture deja reglee (ex. especes le jour de l'intervention) : on
    // remercie et on ne propose pas de payer une deuxieme fois.
    const dejaPayee = Boolean(devis.payee_le);
    const prestation = devis.date_prestation ? `de la prestation du ${dateFr(devis.date_prestation)}` : "de votre prestation";
    const conditions = profil?.conditions_paiement?.trim();
    const noteTicket = dejaPayee
      ? `Réglée le ${dateFr(devis.payee_le)}${devis.moyen_paiement ? ` (${echapperHtml(devis.moyen_paiement)})` : ""} · merci !`
      : [conditions ? `Conditions : ${echapperHtml(conditions)}` : null, "Facture jointe en PDF"].filter(Boolean).join(" · ");
    const montantTTC = totauxTicket(totalHT, tauxTva).total;

    // Un seul mail, quel que soit le mode de paiement choisi a la creation :
    // le client choisit. Bouton "Payer en ligne" si l'artisan a active le
    // paiement en ligne, puis les autres moyens (IBAN dans le mail, cheque ou
    // especes en repondant). Facture deja reglee : ni bouton ni moyens.
    const enLigne = Boolean(profil?.stripe_paiement_actif) && !dejaPayee;
    const iban = String(profil?.iban || "")
      .replace(/\s+/g, "")
      .toUpperCase()
      .replace(/(.{4})/g, "$1 ")
      .trim();
    const autresMoyens = dejaPayee
      ? ""
      : `<div style="margin-top:${enLigne ? "22px" : "4px"};font-size:14px;line-height:1.6;">
          <div style="font-weight:700;margin-bottom:6px;">${enLigne ? "Vous préférez un autre moyen ?" : "Pour régler cette facture :"}</div>
          ${
            iban
              ? `<div style="margin-bottom:6px;"><strong>Virement</strong><br>
                   IBAN : <span style="font-family:Consolas,Menlo,monospace;white-space:nowrap;">${echapperHtml(iban)}</span><br>
                   <span style="color:#6b7686;font-size:13px;">Référence : ${numero ? `Facture n°${numero}` : "votre nom"}</span></div>`
              : ""
          }
          <div><strong>Chèque ou espèces</strong> : répondez simplement à ce mail pour convenir du règlement.</div>
        </div>`;

    const { error: erreurResend } = await resend.emails.send({
      from: expediteur(nomArtisan),
      replyTo: emailArtisan || undefined,
      to: devis.client_email,
      // Copie cachee a l'artisan s'il a active "Recevoir une copie de mes
      // envois" (Parametres).
      bcc: profil?.copie_envois && emailArtisan ? emailArtisan : undefined,
      subject: `Votre facture${numero ? ` n°${numero}` : ""}${nomArtisan ? ` – ${nomArtisan}` : ""}`,
      html: emailClientHtml({
        nomArtisan: nomArtisan || "Votre facture",
        etiquette: numero ? `Facture n°${numero}` : "Facture",
        corpsHtml: `
          <p style="margin:0 0 10px;">Bonjour${devis.client_nom ? ` ${echapperHtml(devis.client_nom)}` : ""},</p>
          <p style="margin:0;">Merci pour votre confiance ! Voici la facture ${prestation}.</p>
        `,
        ticket: {
          lignes: lignesTicket(
            (lignes || []).map((l) => ({
              description: l.description,
              quantite: l.quantite,
              unite: l.unite,
              prixUnitaire: l.prix_unitaire,
            }))
          ),
          ...totauxTicket(totalHT, tauxTva),
          note: noteTicket,
        },
        boutonUrl: enLigne ? lienSuivi : null,
        boutonTexte: `Payer ${montantTTC} en ligne`,
        sousBouton: "Carte bancaire, Apple Pay ou Google Pay · paiement sécurisé",
        apresBoutonHtml: autresMoyens,
        signature: signatureArtisan(profil, nomArtisan),
      }),
      attachments: [
        ...(await logoInline()),
        {
          filename: nomFichierPdf("Facture", numero, nomArtisan),
          content: pdfBuffer,
        },
      ],
    });

    if (erreurResend) {
      return NextResponse.json({ erreur: erreurResend.message }, { status: 500 });
    }

    await supabase.from("devis").update({ facture_envoyee_le: new Date().toISOString() }).eq("id", params.id);

    return NextResponse.json({ succes: true });
  } catch (e: any) {
    return NextResponse.json({ erreur: e.message }, { status: 500 });
  }
}
