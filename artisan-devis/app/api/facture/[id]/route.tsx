import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminSupabase, getArtisanConnecte } from "@/lib/supabaseServerClient";
import { DevisPDF } from "@/lib/devisPdf";
import { emailHtml } from "@/lib/emailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const resultat = await getArtisanConnecte(req.headers.get("authorization"));
  if ("erreur" in resultat) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: resultat.statut });
  }
  const { artisan } = resultat;

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

  if (!devis.client_email) {
    return NextResponse.json({ erreur: "Aucun email de client enregistré sur ce devis" }, { status: 400 });
  }

  const { data: ligne } = await supabase
    .from("lignes_devis")
    .select("*")
    .eq("devis_id", params.id)
    .limit(1)
    .maybeSingle();

  const { data: profil } = await supabase
    .from("artisans")
    .select("*")
    .eq("id", devis.artisan_id)
    .maybeSingle();

  const tauxTva = profil?.taux_tva ?? 20;
  const totalHT = ligne?.total_ligne ?? devis.total ?? 0;
  const montantTva = (totalHT * tauxTva) / 100;
  const totalTTC = totalHT + montantTva;

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
        clientNom={devis.client_nom || ""}
        clientAdresse={devis.client_adresse}
        description={ligne?.description || ""}
        quantite={ligne?.quantite || 1}
        unite={ligne?.unite || "forfait"}
        prixUnitaire={ligne?.prix_unitaire || totalHT}
        totalHT={totalHT}
        tauxTva={tauxTva}
        date={new Date(devis.facture_creee_le)}
        type="facture"
        numero={devis.numero_facture}
      />
    );

    const { error: erreurResend } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: devis.client_email,
      subject: `Votre facture${devis.numero_facture ? ` n°${devis.numero_facture}` : ""} - ${devis.client_nom || ""}`,
      html: emailHtml({
        titre: `Facture pour ${devis.client_nom || ""}`,
        corpsHtml: `
          <p style="margin:0 0 16px;"><strong>Total TTC :</strong> ${totalTTC.toFixed(2)} €</p>
          <p style="margin:0 0 4px;">Vous trouverez la facture détaillée en pièce jointe.</p>
          <p style="margin:0;">Merci pour votre confiance.</p>
        `,
        boutonUrl: `${req.nextUrl.origin}/api/devis-pdf/${params.id}`,
        boutonTexte: "Télécharger la facture",
      }),
      attachments: [
        {
          filename: "facture.pdf",
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
