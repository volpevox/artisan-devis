import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { getArtisanConnecte } from "@/lib/supabaseServerClient";
import { DevisPDF } from "@/lib/devisPdf";
import { nomAffichageDocument } from "@/lib/nomAffichage";
import { emailHtml } from "@/lib/emailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { clientEmail, clientNom, clientAdresse, lignes, prix, devisId } = await req.json();

  if (!clientEmail) {
    return NextResponse.json({ erreur: "Aucun email de client fourni" }, { status: 400 });
  }

  const lienSignature = devisId ? `${req.nextUrl.origin}/signer/${devisId}` : null;

  const resultat = await getArtisanConnecte(req.headers.get("authorization"));
  if ("erreur" in resultat) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: resultat.statut });
  }
  const { supabase, artisan: profil } = resultat;

  const { data: devisRow } = devisId
    ? await supabase.from("devis").select("numero_devis, date_prestation").eq("id", devisId).maybeSingle()
    : { data: null };

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
          telephone: profil?.telephone,
          adresse: profil?.adresse,
          codePostal: profil?.code_postal,
          ville: profil?.ville,
          logoUrl: profil?.logo_url,
          siret: profil?.siret,
          numeroTva: profil?.numero_tva,
          iban: profil?.iban,
          conditionsPaiement: profil?.conditions_paiement,
        }}
        clientNom={clientNom}
        clientAdresse={clientAdresse}
        lignes={lignes}
        tauxTva={tauxTva}
        date={date}
        datePrestation={devisRow?.date_prestation ? new Date(devisRow.date_prestation) : null}
        numero={devisRow?.numero_devis}
      />
    );

    const descriptionEmail = (lignes || []).map((l: any) => l.description).filter(Boolean).join(", ");

    const { error: erreurResend } = await resend.emails.send({
      from: "VolpeVox <devis@volpevox.fr>",
      replyTo: resultat.email || undefined,
      to: clientEmail,
      subject: `Votre devis${devisRow?.numero_devis ? ` n°${devisRow.numero_devis}` : ""} - ${clientNom}`,
      html: emailHtml({
        titre: `Devis pour ${clientNom}`,
        corpsHtml: `
          <p style="margin:0 0 12px;">Bonjour${clientNom ? ` ${clientNom}` : ""},</p>
          <p style="margin:0 0 12px;">Voici votre devis, avec tous les détails dans le PDF joint.</p>
          <p style="margin:0 0 4px;">${descriptionEmail}</p>
          <p style="margin:0 0 20px;">Total : <strong>${totalTTC.toFixed(2)} € TTC</strong></p>
          <p style="margin:0 0 12px;">Vous pouvez le signer directement en ligne en un clic, ci-dessous.</p>
          <p style="margin:0;">Une question ? N'hésitez pas à répondre directement à cet email.</p>
        `,
        boutonUrl: lienSignature,
        boutonTexte: "Signer ce devis en ligne",
      }),
      attachments: [
        {
          filename: "devis.pdf",
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
