import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { createServerSupabase } from "@/lib/supabaseServerClient";
import { DevisPDF } from "@/lib/devisPdf";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { clientEmail, clientNom, clientAdresse, description, quantite, unite, prixUnitaire, prix, devisId } =
    await req.json();

  if (!clientEmail) {
    return NextResponse.json({ erreur: "Aucun email de client fourni" }, { status: 400 });
  }

  const lienSignature = devisId ? `${req.nextUrl.origin}/signer/${devisId}` : null;

  const supabase = createServerSupabase(req.headers.get("authorization"));
  const { data: profil } = await supabase.from("artisans").select("*").limit(1).maybeSingle();

  const tauxTva = profil?.taux_tva ?? 20;
  const totalHT = Number(prix) || 0;
  const montantTva = (totalHT * tauxTva) / 100;
  const totalTTC = totalHT + montantTva;
  const date = new Date();

  try {
    const pdfBuffer = await renderToBuffer(
      <DevisPDF
        entreprise={{
          nom: profil?.nom_entreprise,
          telephone: profil?.telephone,
          adresse: profil?.adresse,
          logoUrl: profil?.logo_url,
          siret: profil?.siret,
          numeroTva: profil?.numero_tva,
          iban: profil?.iban,
          conditionsPaiement: profil?.conditions_paiement,
          mentionsLegales: profil?.mentions_legales,
        }}
        clientNom={clientNom}
        clientAdresse={clientAdresse}
        description={description}
        quantite={Number(quantite) || 1}
        unite={unite || "forfait"}
        prixUnitaire={Number(prixUnitaire) || totalHT}
        totalHT={totalHT}
        tauxTva={tauxTva}
        date={date}
      />
    );

    const { error: erreurResend } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: clientEmail,
      subject: `Votre devis - ${clientNom}`,
      html: `
        <h2>Devis pour ${clientNom}</h2>
        <p><strong>Description :</strong> ${description}</p>
        <p><strong>Total TTC :</strong> ${totalTTC.toFixed(2)} €</p>
        <p>Vous trouverez le devis détaillé en pièce jointe.</p>
        ${
          lienSignature
            ? `<p><a href="${lienSignature}" style="display:inline-block;padding:10px 20px;background:#103362;color:#fff;text-decoration:none;border-radius:6px;">Signer ce devis en ligne</a></p>`
            : ""
        }
        <p>N'hésitez pas à nous contacter pour toute question.</p>
      `,
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
