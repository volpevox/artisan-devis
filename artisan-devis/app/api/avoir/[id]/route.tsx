import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminSupabase, getArtisanConnecte } from "@/lib/supabaseServerClient";
import { DevisPDF } from "@/lib/devisPdf";
import { nomAffichageDocument } from "@/lib/nomAffichage";
import { emailHtml, logoInline } from "@/lib/emailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

// Annule une facture deja envoyee par un avoir (facture en negatif, numero
// AV-n). Une facture envoyee ne se supprime plus : pas de trou dans la
// numerotation, et des 2027 elle sera deja transmise au fisc. L'avoir est
// enregistre sur la ligne de la facture (supabase/avoirs.sql) puis envoye au
// client s'il a un email.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const resultat = await getArtisanConnecte(req.headers.get("authorization"));
  if ("erreur" in resultat) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: resultat.statut });
  }
  const { artisan, email: emailArtisan } = resultat;

  const supabase = createAdminSupabase();
  const { data: devis } = await supabase.from("devis").select("*").eq("id", params.id).maybeSingle();

  if (!devis) {
    return NextResponse.json({ erreur: "Facture introuvable" }, { status: 404 });
  }

  if (devis.artisan_id !== artisan.id) {
    return NextResponse.json({ erreur: "Cette facture ne t'appartient pas" }, { status: 403 });
  }

  if (!devis.est_facture) {
    return NextResponse.json({ erreur: "Seule une facture peut être annulée par un avoir" }, { status: 400 });
  }

  if (!devis.facture_envoyee_le) {
    return NextResponse.json(
      { erreur: "Cette facture n'a pas encore été envoyée : tu peux simplement la supprimer." },
      { status: 400 }
    );
  }

  if (devis.avoir_numero) {
    return NextResponse.json({ erreur: `Cette facture est déjà annulée (avoir AV-${devis.avoir_numero})` }, { status: 400 });
  }

  const { data: numero, error: erreurNumero } = await supabase.rpc("numero_avoir_suivant", {
    p_artisan_id: devis.artisan_id,
  });

  if (erreurNumero || !numero) {
    return NextResponse.json({ erreur: "Numérotation de l'avoir impossible : " + (erreurNumero?.message || "") }, { status: 500 });
  }

  const avoirCreeLe = new Date().toISOString();
  const { error: erreurMaj } = await supabase
    .from("devis")
    .update({ avoir_numero: numero, avoir_cree_le: avoirCreeLe })
    .eq("id", params.id)
    .is("avoir_numero", null);

  if (erreurMaj) {
    return NextResponse.json({ erreur: erreurMaj.message }, { status: 500 });
  }

  if (!devis.client_email) {
    return NextResponse.json({ succes: true, envoye: false, numero });
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
  const totalTTC = totalHT + (totalHT * tauxTva) / 100;

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
          assurancePro: profil?.assurance_pro,
          mediateurConso: profil?.mediateur_conso,
        }}
        clientNom={devis.client_nom || ""}
        clientAdresse={devis.client_adresse}
        clientTelephone={devis.client_telephone}
        clientSiren={devis.client_siren}
        lignes={(lignes || []).map((l) => ({
          description: l.description || "",
          quantite: l.quantite || 1,
          unite: l.unite || "forfait",
          prixUnitaire: -(l.prix_unitaire || 0),
        }))}
        tauxTva={tauxTva}
        date={new Date(avoirCreeLe)}
        type="avoir"
        numero={numero}
        avoirDe={{ numero: devis.numero_facture, date: new Date(devis.facture_creee_le) }}
        datePrestation={devis.date_prestation ? new Date(devis.date_prestation) : null}
      />
    );

    const numeroFacture = devis.numero_facture ? ` n°${devis.numero_facture}` : "";
    const { error: erreurResend } = await resend.emails.send({
      from: "VolpeVox <devis@volpevox.fr>",
      replyTo: emailArtisan || undefined,
      to: devis.client_email,
      bcc: profil?.copie_envois && emailArtisan ? emailArtisan : undefined,
      subject: `Avoir AV-${numero} - annulation de la facture${numeroFacture}`,
      html: emailHtml({
        titre: `Annulation de la facture${numeroFacture}`,
        corpsHtml: `
          <p style="margin:0 0 12px;">Bonjour${devis.client_nom ? ` ${devis.client_nom}` : ""},</p>
          <p style="margin:0 0 12px;">La facture${numeroFacture} est annulée. Vous trouverez en pièce jointe l'avoir correspondant.</p>
          <p style="margin:0 0 20px;">Montant de l'avoir : <strong>-${totalTTC.toFixed(2)} € TTC</strong></p>
          <p style="margin:0;">Pour toute question, il vous suffit de répondre à cet email.</p>
        `,
        boutonUrl: `${req.nextUrl.origin}/api/devis-pdf/${params.id}?avoir=1`,
        boutonTexte: "Télécharger l'avoir",
      }),
      attachments: [
        ...(await logoInline()),
        {
          filename: `avoir-AV-${numero}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (erreurResend) {
      // L'avoir existe bien : seul l'email n'est pas parti.
      return NextResponse.json({ succes: true, envoye: false, numero, erreurEnvoi: erreurResend.message });
    }

    return NextResponse.json({ succes: true, envoye: true, numero });
  } catch (e: any) {
    return NextResponse.json({ succes: true, envoye: false, numero, erreurEnvoi: e.message });
  }
}
