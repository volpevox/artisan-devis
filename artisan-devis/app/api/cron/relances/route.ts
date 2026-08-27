import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminSupabase } from "@/lib/supabaseServerClient";
import { emailHtml, logoInline } from "@/lib/emailTemplate";

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

  // --- Invitations "acces gratuit" -----------------------------------
  // Envoie une seule fois un mail de bienvenue personnalise. Marley controle
  // qui le recoit avec la case "envoyer_le_mail" dans le Table Editor :
  // le mail ne part QUE pour les lignes cochees. "invite_le" (rempli ici
  // apres l'envoi) empeche un second envoi a la meme personne.
  // Voir supabase/acces-gratuit-invitations.sql.
  let invitationsEnvoyees = 0;
  const { data: aInviter } = await supabase
    .from("acces_gratuit_emails")
    .select("email, prenom")
    .eq("actif", true)
    .eq("envoyer_le_mail", true)
    .is("invite_le", null);

  for (const personne of aInviter || []) {
    if (!personne.email) continue;
    try {
      await envoyerInvitationAccesGratuit(personne);
      await supabase
        .from("acces_gratuit_emails")
        .update({ invite_le: new Date().toISOString() })
        .eq("email", personne.email);
      invitationsEnvoyees++;
    } catch (e) {
      // Un echec d'envoi ne bloque pas le reste du cron : invite_le reste
      // vide, on reessaiera au prochain passage.
      console.error("Invitation acces gratuit echouee pour", personne.email, e);
    }
  }

  return NextResponse.json({ succes: true, relancesEnvoyees, invitationsEnvoyees });
}

// Mail de bienvenue envoye a une personne a qui Marley offre l'acces gratuit.
// L'adresse de reponse est celle de Marley pour qu'il recoive les questions.
async function envoyerInvitationAccesGratuit(
  personne: { email: string; prenom: string | null },
) {
  const bonjour = personne.prenom ? `Bonjour ${personne.prenom},` : "Bonjour,";

  await resend.emails.send({
    from: "VolpeVox <devis@volpevox.fr>",
    replyTo: "volpevox@outlook.fr",
    to: personne.email,
    subject: "Ton accès gratuit à VolpeVox est prêt 🦊",
    html: emailHtml({
      titre: "Ton accès gratuit à VolpeVox est prêt 🦊",
      corpsHtml: `
        <p>${bonjour}</p>
        <p>Ton accès gratuit à VolpeVox est prêt : tu dictes ta prestation, le devis se remplit tout seul, ton client signe sur son téléphone, et tu transformes le devis en facture en un clic.</p>
        <p>Pour commencer, crée ton compte avec <strong>cette adresse email</strong> (${personne.email}) : l'accès gratuit s'activera tout seul.</p>
        <p style="background:#fbf3dd;border-left:3px solid #d4af37;border-radius:6px;padding:12px 14px;margin:16px 0;"><strong style="color:#0d1b2a;">Conseil :</strong> dès la première ouverture, ajoute VolpeVox à ton écran d'accueil — sur iPhone, appuie sur le bouton Partager puis « Sur l'écran d'accueil » ; sur Android, menu ⋮ puis « Ajouter à l'écran d'accueil ». L'app s'ouvre alors en plein écran, comme une vraie application, et c'est bien plus agréable à utiliser que dans le navigateur.</p>
        <p>Une question ? Réponds simplement à ce mail.</p>
      `,
      boutonUrl: "https://app.volpevox.fr/connexion?mode=inscription",
      boutonTexte: "Créer mon compte",
    }),
    attachments: [...(await logoInline())],
  });
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
    attachments: [...(await logoInline())],
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
    attachments: [...(await logoInline())],
  });
}
