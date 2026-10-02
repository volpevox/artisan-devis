import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { getArtisanConnecte } from "@/lib/supabaseServerClient";
import { DevisPDF } from "@/lib/devisPdf";
import { nomAffichageDocument, mentionSociete, nomCourt } from "@/lib/nomAffichage";
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

export async function POST(req: NextRequest) {
  const { clientEmail, clientNom, clientTelephone, clientSiren, clientType, adressePrestation, debutPrestation, dureePrestation, clientAdresse, lignes, prix, devisId } =
    await req.json();

  if (!clientEmail) {
    return NextResponse.json({ erreur: "Aucun email de client fourni" }, { status: 400 });
  }

  if (!devisId) {
    return NextResponse.json({ erreur: "Aucun devis fourni" }, { status: 400 });
  }

  const lienSignature = `${req.nextUrl.origin}/signer/${devisId}`;

  const resultat = await getArtisanConnecte(req.headers.get("authorization"));
  if ("erreur" in resultat) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: resultat.statut });
  }
  const { supabase, artisan: profil } = resultat;

  const { data: devisRow } = await supabase
    .from("devis")
    .select("numero_devis, artisan_id")
    .eq("id", devisId)
    .maybeSingle();

  if (!devisRow) {
    return NextResponse.json({ erreur: "Devis introuvable" }, { status: 404 });
  }

  if (devisRow.artisan_id !== profil.id) {
    return NextResponse.json({ erreur: "Ce devis ne t'appartient pas" }, { status: 403 });
  }

  const tauxTva = profil?.taux_tva ?? 20;
  const totalHT = Number(prix) || 0;
  const montantTva = (totalHT * tauxTva) / 100;
  const totalTTC = totalHT + montantTva;
  const date = new Date();

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
          validiteJours: profil?.duree_validite_devis,
        }}
        clientNom={clientNom}
        clientAdresse={clientAdresse}
        clientTelephone={clientTelephone}
        clientSiren={clientSiren || null}
        clientType={clientType || null}
        adressePrestation={adressePrestation || null}
        debutPrestation={debutPrestation || null}
        dureePrestation={dureePrestation || null}
        lignes={lignes}
        tauxTva={tauxTva}
        date={date}
        numero={devisRow?.numero_devis}
      />
    );

    const nomArtisan = nomAffichageDocument(profil);
    const numero = devisRow?.numero_devis;

    const validiteJours = Number(profil?.duree_validite_devis) || 0;
    const valableJusquau =
      validiteJours > 0
        ? new Date(date.getTime() + validiteJours * 86400000).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })
        : null;

    const { error: erreurResend } = await resend.emails.send({
      from: expediteur(nomCourt(profil)),
      replyTo: resultat.email || undefined,
      to: clientEmail,
      // L'artisan recoit une copie cachee de son envoi s'il a active le
      // reglage "Recevoir une copie de mes envois" (Parametres).
      bcc: profil?.copie_envois && resultat.email ? resultat.email : undefined,
      subject: `Votre devis${numero ? ` n°${numero}` : ""}${nomArtisan ? ` – ${nomArtisan}` : ""}`,
      html: emailClientHtml({
        nomArtisan: nomArtisan || "Votre devis",
        etiquette: numero ? `Devis n°${numero}` : "Devis",
        corpsHtml: `
          <p style="margin:0 0 10px;">Bonjour${clientNom ? ` ${echapperHtml(clientNom)}` : ""},</p>
          <p style="margin:0;">Suite à notre échange, voici votre devis.</p>
        `,
        ticket: {
          lignes: lignesTicket(lignes || []),
          ...totauxTicket(totalHT, tauxTva),
          note: [valableJusquau ? `Valable jusqu'au ${valableJusquau}` : null, "Détail complet dans le PDF joint"]
            .filter(Boolean)
            .join(" · "),
        },
        apresTicketHtml: `<p style="margin:0;">S'il vous convient, vous pouvez le signer en ligne depuis votre téléphone, en quelques secondes.</p>`,
        boutonUrl: lienSignature,
        boutonTexte: "Voir et signer le devis",
        sousBouton: "Signature électronique sécurisée, sans imprimer",
        signature: signatureArtisan(profil, nomArtisan),
      }),
      attachments: [
        ...(await logoInline()),
        {
          filename: nomFichierPdf("Devis", numero, nomArtisan),
          content: pdfBuffer,
        },
      ],
    });

    if (erreurResend) {
      return NextResponse.json({ erreur: erreurResend.message }, { status: 500 });
    }

    return NextResponse.json({ succes: true });
  } catch (e: any) {
    return NextResponse.json({ erreur: e.message }, { status: 500 });
  }
}
