import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { getArtisanConnecte } from "@/lib/supabaseServerClient";
import { DevisPDF } from "@/lib/devisPdf";
import { nomAffichageDocument, mentionSociete } from "@/lib/nomAffichage";
import { emailClientHtml, echapperHtml, expediteur, formaterEuros, logoInline, nomFichierPdf } from "@/lib/emailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { clientEmail, clientNom, clientTelephone, clientSiren, clientAdresse, lignes, prix, devisId } = await req.json();

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
          conditionsPaiement: profil?.conditions_paiement,
          assurancePro: profil?.assurance_pro,
          mediateurConso: profil?.mediateur_conso,
          validiteJours: profil?.duree_validite_devis,
        }}
        clientNom={clientNom}
        clientAdresse={clientAdresse}
        clientTelephone={clientTelephone}
        clientSiren={clientSiren || null}
        lignes={lignes}
        tauxTva={tauxTva}
        date={date}
        numero={devisRow?.numero_devis}
      />
    );

    const nomArtisan = nomAffichageDocument(profil);
    const numero = devisRow?.numero_devis;

    // Lignes du ticket : "Pose carrelage (12 m²)  540,00 €" (montants HT,
    // comme sur le PDF). Au-dela de 6 lignes, le reste est resume.
    const quantiteCourte = (q: number, unite: string) => {
      const n = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(q);
      const abrev: Record<string, string> = { heure: "h", jour: "j", "m²": "m²", ml: "ml" };
      if (abrev[unite]) return `${n} ${abrev[unite]}`;
      return q !== 1 ? `× ${n}` : "";
    };
    const lignesTicket = (lignes || [])
      .filter((l: any) => l.description || Number(l.prixUnitaire))
      .map((l: any) => {
        const q = Number(l.quantite) || 1;
        const qte = quantiteCourte(q, l.unite || "forfait");
        return {
          libelle: `${echapperHtml(l.description) || "Prestation"}${qte ? ` <span style="color:#6b7686;">(${qte})</span>` : ""}`,
          montant: formaterEuros(q * (Number(l.prixUnitaire) || 0)),
        };
      });
    const MAX_LIGNES = 6;
    const lignesAffichees =
      lignesTicket.length > MAX_LIGNES
        ? [
            ...lignesTicket.slice(0, MAX_LIGNES - 1),
            {
              libelle: `<span style="color:#6b7686;">… et ${lignesTicket.length - (MAX_LIGNES - 1)} autres lignes (voir le PDF)</span>`,
              montant: "",
            },
          ]
        : lignesTicket;

    const validiteJours = Number(profil?.duree_validite_devis) || 0;
    const valableJusquau =
      validiteJours > 0
        ? new Date(date.getTime() + validiteJours * 86400000).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })
        : null;

    const { error: erreurResend } = await resend.emails.send({
      from: expediteur(nomArtisan),
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
          lignes: lignesAffichees,
          totaux:
            tauxTva > 0
              ? [
                  { libelle: "Total HT", montant: formaterEuros(totalHT) },
                  { libelle: `TVA ${String(tauxTva).replace(".", ",")} %`, montant: formaterEuros(montantTva) },
                ]
              : [],
          totalLibelle: tauxTva > 0 ? "Total TTC" : "Total",
          total: formaterEuros(totalTTC),
          note: [valableJusquau ? `Valable jusqu'au ${valableJusquau}` : null, "Détail complet dans le PDF joint"]
            .filter(Boolean)
            .join(" · "),
        },
        apresTicketHtml: `<p style="margin:0;">S'il vous convient, vous pouvez le signer en ligne depuis votre téléphone, en quelques secondes.</p>`,
        boutonUrl: lienSignature,
        boutonTexte: "Voir et signer le devis",
        sousBouton: "Signature électronique sécurisée, sans imprimer",
        signature: {
          personne: profil?.nom_complet,
          entreprise: profil?.nom_entreprise || (profil?.nom_complet ? null : nomArtisan),
          telephone: profil?.telephone,
        },
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
