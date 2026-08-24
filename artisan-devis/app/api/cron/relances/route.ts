import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminSupabase } from "@/lib/supabaseServerClient";
import { emailHtml } from "@/lib/emailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);
const UN_JOUR_MS = 24 * 60 * 60 * 1000;

export const dynamic = "force-dynamic";

// Declenchee une fois par jour par Vercel Cron (voir vercel.json). Relance
// par email les devis envoyes mais pas signes, et les factures envoyees mais
// pas payees, a J+3 puis J+7 apres l'envoi -- une seule fois par echeance
// grace aux colonnes relance_j3_envoyee_le / relance_j7_envoyee_le.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  const origin = req.nextUrl.origin;
  const maintenant = Date.now();
  let relancesEnvoyees = 0;

  const { data: devisEnAttente } = await supabase
    .from("devis")
    .select("*")
    .eq("est_facture", false)
    .eq("statut", "envoye")
    .not("envoye_le", "is", null)
    .is("relance_j7_envoyee_le", null);

  for (const devis of devisEnAttente || []) {
    if (!devis.client_email) continue;
    const joursEcoules = (maintenant - new Date(devis.envoye_le).getTime()) / UN_JOUR_MS;

    if (joursEcoules >= 7 && !devis.relance_j7_envoyee_le) {
      await envoyerRelanceDevis(devis, origin, supabase);
      await supabase.from("devis").update({ relance_j7_envoyee_le: new Date().toISOString() }).eq("id", devis.id);
      relancesEnvoyees++;
    } else if (joursEcoules >= 3 && !devis.relance_j3_envoyee_le) {
      await envoyerRelanceDevis(devis, origin, supabase);
      await supabase.from("devis").update({ relance_j3_envoyee_le: new Date().toISOString() }).eq("id", devis.id);
      relancesEnvoyees++;
    }
  }

  const { data: facturesEnAttente } = await supabase
    .from("devis")
    .select("*")
    .eq("est_facture", true)
    .is("payee_le", null)
    .not("facture_envoyee_le", "is", null)
    .is("relance_j7_envoyee_le", null);

  for (const facture of facturesEnAttente || []) {
    if (!facture.client_email) continue;
    const joursEcoules = (maintenant - new Date(facture.facture_envoyee_le).getTime()) / UN_JOUR_MS;

    if (joursEcoules >= 7 && !facture.relance_j7_envoyee_le) {
      await envoyerRelanceFacture(facture, origin, supabase);
      await supabase.from("devis").update({ relance_j7_envoyee_le: new Date().toISOString() }).eq("id", facture.id);
      relancesEnvoyees++;
    } else if (joursEcoules >= 3 && !facture.relance_j3_envoyee_le) {
      await envoyerRelanceFacture(facture, origin, supabase);
      await supabase.from("devis").update({ relance_j3_envoyee_le: new Date().toISOString() }).eq("id", facture.id);
      relancesEnvoyees++;
    }
  }

  return NextResponse.json({ succes: true, relancesEnvoyees });
}

// Recupere l'email de connexion de l'artisan, pour que les reponses du
// client arrivent chez lui plutot que dans une boite VolpeVox non surveillee.
async function recupererEmailArtisan(supabase: ReturnType<typeof createAdminSupabase>, artisanId: string) {
  const { data: profil } = await supabase
    .from("artisans")
    .select("user_id")
    .eq("id", artisanId)
    .maybeSingle();

  if (!profil?.user_id) return undefined;

  const { data: userData } = await supabase.auth.admin.getUserById(profil.user_id);
  return userData?.user?.email;
}

async function envoyerRelanceDevis(devis: any, origin: string, supabase: ReturnType<typeof createAdminSupabase>) {
  const emailArtisan = await recupererEmailArtisan(supabase, devis.artisan_id);

  await resend.emails.send({
    from: "VolpeVox <devis@volpevox.fr>",
    replyTo: emailArtisan || undefined,
    to: devis.client_email,
    subject: `Rappel : votre devis${devis.numero_devis ? ` n°${devis.numero_devis}` : ""} en attente de signature`,
    html: emailHtml({
      titre: "Votre devis est toujours en attente",
      corpsHtml: `
        <p>Bonjour${devis.client_nom ? ` ${devis.client_nom}` : ""},</p>
        <p>Petit rappel : votre devis${devis.numero_devis ? ` n°${devis.numero_devis}` : ""} est toujours en attente de signature. Prenez quelques minutes pour le consulter et le valider en ligne quand vous voulez.</p>
      `,
      boutonUrl: `${origin}/signer/${devis.id}`,
      boutonTexte: "Consulter et signer le devis",
    }),
  });
}

async function envoyerRelanceFacture(facture: any, origin: string, supabase: ReturnType<typeof createAdminSupabase>) {
  const emailArtisan = await recupererEmailArtisan(supabase, facture.artisan_id);

  await resend.emails.send({
    from: "VolpeVox <devis@volpevox.fr>",
    replyTo: emailArtisan || undefined,
    to: facture.client_email,
    subject: `Rappel : facture${facture.numero_facture ? ` n°${facture.numero_facture}` : ""} en attente de paiement`,
    html: emailHtml({
      titre: "Facture en attente de règlement",
      corpsHtml: `
        <p>Bonjour${facture.client_nom ? ` ${facture.client_nom}` : ""},</p>
        <p>Petit rappel : votre facture${facture.numero_facture ? ` n°${facture.numero_facture}` : ""} d'un montant de ${facture.total} € HT est toujours en attente de règlement. N'hésitez pas à nous contacter si besoin.</p>
      `,
      boutonUrl: `${origin}/api/devis-pdf/${facture.id}`,
      boutonTexte: "Voir la facture",
    }),
  });
}
