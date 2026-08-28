import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminSupabase, getArtisanConnecte } from "@/lib/supabaseServerClient";
import { DevisPDF } from "@/lib/devisPdf";
import { nomAffichageDocument } from "@/lib/nomAffichage";
import { emailHtml, logoInline } from "@/lib/emailTemplate";

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
        }}
        clientNom={devis.client_nom || ""}
        clientAdresse={devis.client_adresse}
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
    // Le mode de paiement choisi a la creation de la facture (moyen_paiement)
    // prime : si l'artisan a choisi un moyen manuel (especes, cheque...), le
    // bouton "Payer en ligne" ne doit pas apparaitre meme si le paiement en
    // ligne est actif chez lui. Un moyen_paiement absent (factures issues de
    // l'ancienne transformation devis -> facture en un clic, qui ne demande
    // pas ce choix) garde le comportement d'origine : bouton affiche des que
    // le paiement en ligne est actif chez l'artisan.
    const modeChoisiExcluLigne = devis.moyen_paiement && devis.moyen_paiement !== "Carte bancaire (en ligne)";
    const paiementEnLigneActif = Boolean(profil?.stripe_paiement_actif) && !modeChoisiExcluLigne;

    const { error: erreurResend } = await resend.emails.send({
      from: "VolpeVox <devis@volpevox.fr>",
      replyTo: emailArtisan || undefined,
      to: devis.client_email,
      subject: `Votre facture${devis.numero_facture ? ` n°${devis.numero_facture}` : ""} - ${devis.client_nom || ""}`,
      html: emailHtml({
        titre: `Facture pour ${devis.client_nom || ""}`,
        corpsHtml: `
          <p style="margin:0 0 12px;">Bonjour${devis.client_nom ? ` ${devis.client_nom}` : ""},</p>
          <p style="margin:0 0 12px;">Voici votre facture, en pièce jointe.</p>
          <p style="margin:0 0 20px;">Total : <strong>${totalTTC.toFixed(2)} € TTC</strong></p>
          ${
            paiementEnLigneActif
              ? `<p style="margin:0 0 12px;">Vous pouvez régler en ligne directement, en toute sécurité, ci-dessous.</p>`
              : ""
          }
          <p style="margin:0;">Merci pour votre confiance, et à bientôt !</p>
        `,
        boutonUrl: paiementEnLigneActif ? lienSuivi : `${req.nextUrl.origin}/api/devis-pdf/${params.id}`,
        boutonTexte: paiementEnLigneActif ? "Payer en ligne" : "Télécharger la facture",
      }),
      attachments: [
        ...(await logoInline()),
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
