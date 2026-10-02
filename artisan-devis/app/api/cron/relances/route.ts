import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminSupabase } from "@/lib/supabaseServerClient";
import {
  blocAutresMoyens,
  echapperHtml,
  emailClientHtml,
  emailHtml,
  expediteur,
  logoInline,
  signatureArtisan,
  totauxTicket,
  formaterEuros,
} from "@/lib/emailTemplate";
import { nomAffichageDocument, nomCourt } from "@/lib/nomAffichage";
import { resteAPayer } from "@/lib/acompte";

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

  // Artisans qui ont coupe les relances automatiques (reglage Parametres) :
  // on n'envoie aucune relance a leurs clients. Recupere une seule fois
  // plutot qu'une requete par devis/facture.
  const { data: artisansSansRelances } = await supabase
    .from("artisans")
    .select("id")
    .eq("relances_actives", false);
  const relancesCoupees = new Set((artisansSansRelances || []).map((a) => a.id));

  const { data: devisEnAttente } = await supabase
    .from("devis")
    .select("*")
    .eq("est_facture", false)
    .eq("statut", "envoye")
    .not("envoye_le", "is", null)
    .is("relance_j7_envoyee_le", null);

  for (const devis of devisEnAttente || []) {
    if (!devis.client_email) continue;
    if (relancesCoupees.has(devis.artisan_id)) continue;
    const joursEcoules = (maintenant - new Date(devis.envoye_le).getTime()) / UN_JOUR_MS;

    if (joursEcoules >= 7 && !devis.relance_j7_envoyee_le) {
      await envoyerRelanceDevis(devis, origin, supabase, joursEcoules >= 7);
      await supabase.from("devis").update({ relance_j7_envoyee_le: new Date().toISOString() }).eq("id", devis.id);
      relancesEnvoyees++;
    } else if (joursEcoules >= 3 && !devis.relance_j3_envoyee_le) {
      await envoyerRelanceDevis(devis, origin, supabase, joursEcoules >= 7);
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
    // Facture annulee par un avoir : plus rien a reclamer.
    if (facture.avoir_numero) continue;
    if (relancesCoupees.has(facture.artisan_id)) continue;
    const joursEcoules = (maintenant - new Date(facture.facture_envoyee_le).getTime()) / UN_JOUR_MS;

    if (joursEcoules >= 7 && !facture.relance_j7_envoyee_le) {
      await envoyerRelanceFacture(facture, origin, supabase, joursEcoules >= 7);
      await supabase.from("devis").update({ relance_j7_envoyee_le: new Date().toISOString() }).eq("id", facture.id);
      relancesEnvoyees++;
    } else if (joursEcoules >= 3 && !facture.relance_j3_envoyee_le) {
      await envoyerRelanceFacture(facture, origin, supabase, joursEcoules >= 7);
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

// Profil de l'artisan (nom, signature, TVA, IBAN...) et son email de
// connexion, pour que les reponses du client arrivent chez lui plutot que
// dans une boite VolpeVox non surveillee.
async function recupererArtisan(supabase: ReturnType<typeof createAdminSupabase>, artisanId: string) {
  const { data: profil } = await supabase.from("artisans").select("*").eq("id", artisanId).maybeSingle();
  if (!profil?.user_id) return { profil, email: undefined };

  const { data: userData } = await supabase.auth.admin.getUserById(profil.user_id);
  return { profil, email: userData?.user?.email };
}

const dateFr = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "";

// derniere = relance J+7 (la seconde et derniere), ton un peu different.
async function envoyerRelanceDevis(
  devis: any,
  origin: string,
  supabase: ReturnType<typeof createAdminSupabase>,
  derniere: boolean
) {
  const { profil, email: emailArtisan } = await recupererArtisan(supabase, devis.artisan_id);
  const nomArtisan = nomAffichageDocument(profil);
  const numero = devis.numero_devis;
  const tauxTva = Number(profil?.taux_tva ?? 20);
  const total = totauxTicket(Number(devis.total) || 0, tauxTva);

  await resend.emails.send({
    from: expediteur(nomCourt(profil)),
    replyTo: emailArtisan || undefined,
    to: devis.client_email,
    subject: `${derniere ? "Votre avis sur le devis" : "Petit rappel : votre devis"}${numero ? ` n°${numero}` : ""}${
      nomArtisan ? ` – ${nomArtisan}` : ""
    }`,
    html: emailClientHtml({
      nomArtisan: nomArtisan || "Votre devis",
      etiquette: `Rappel · Devis${numero ? ` n°${numero}` : ""}`,
      corpsHtml: `
        <p style="margin:0 0 10px;">Bonjour${devis.client_nom ? ` ${echapperHtml(devis.client_nom)}` : ""},</p>
        <p style="margin:0;">${
          derniere
            ? `Je reviens vers vous au sujet du devis envoyé le ${dateFr(devis.envoye_le)}. Est-il toujours d'actualité ? S'il faut ajuster quelque chose, répondez simplement à ce mail.`
            : `Petit rappel : le devis envoyé le ${dateFr(devis.envoye_le)} attend toujours votre accord. Vous pouvez le consulter et le signer en ligne quand vous voulez.`
        }</p>
      `,
      ticket: {
        lignes: [{ libelle: `Devis${numero ? ` n°${numero}` : ""} du ${dateFr(devis.envoye_le)}`, montant: "" }],
        totaux: [],
        totalLibelle: total.totalLibelle,
        total: total.total,
      },
      boutonUrl: `${origin}/signer/${devis.id}`,
      boutonTexte: "Voir et signer le devis",
      sousBouton: "Signature électronique sécurisée, sans imprimer",
      signature: signatureArtisan(profil, nomArtisan),
    }),
    attachments: [...(await logoInline())],
  });
}

async function envoyerRelanceFacture(
  facture: any,
  origin: string,
  supabase: ReturnType<typeof createAdminSupabase>,
  derniere: boolean
) {
  const { profil, email: emailArtisan } = await recupererArtisan(supabase, facture.artisan_id);
  const nomArtisan = nomAffichageDocument(profil);
  const numero = facture.numero_facture;
  const tauxTva = Number(profil?.taux_tva ?? 20);
  // Montant TTC, comme sur la facture (avant : le total HT brut). Apres une
  // facture d'acompte, seulement le reste a payer.
  const total = facture.acompte_numero
    ? { totalLibelle: "Reste à payer", total: formaterEuros(resteAPayer(facture, tauxTva)) }
    : totauxTicket(Number(facture.total) || 0, tauxTva);
  const enLigne = Boolean(profil?.stripe_paiement_actif);
  const dateFacture = dateFr(facture.facture_creee_le || facture.facture_envoyee_le);

  await resend.emails.send({
    from: expediteur(nomCourt(profil)),
    replyTo: emailArtisan || undefined,
    to: facture.client_email,
    subject: `${derniere ? "Second rappel" : "Petit rappel"} : facture${numero ? ` n°${numero}` : ""}${
      nomArtisan ? ` – ${nomArtisan}` : ""
    }`,
    html: emailClientHtml({
      nomArtisan: nomArtisan || "Votre facture",
      etiquette: `Rappel · Facture${numero ? ` n°${numero}` : ""}`,
      corpsHtml: `
        <p style="margin:0 0 10px;">Bonjour${facture.client_nom ? ` ${echapperHtml(facture.client_nom)}` : ""},</p>
        <p style="margin:0;">Sauf erreur de ma part, la facture${numero ? ` n°${numero}` : ""} du ${dateFacture} n'a pas encore été réglée.${
          derniere ? " Merci de bien vouloir procéder au règlement dès que possible." : ""
        } Si c'est déjà fait, merci de ne pas tenir compte de ce message.</p>
      `,
      ticket: {
        lignes: [{ libelle: `Facture${numero ? ` n°${numero}` : ""} du ${dateFacture}`, montant: "" }],
        totaux: [],
        totalLibelle: total.totalLibelle,
        total: total.total,
      },
      boutonUrl: enLigne ? `${origin}/signer/${facture.id}` : null,
      boutonTexte: `Payer ${total.total} en ligne`,
      sousBouton: "Carte bancaire, Apple Pay ou Google Pay · paiement sécurisé",
      apresBoutonHtml: `${blocAutresMoyens({ enLigne, profil, numero })}
        <div style="margin-top:14px;text-align:center;"><a href="${origin}/api/devis-pdf/${facture.id}" style="color:#0b2a5b;font-weight:700;font-size:14px;">Voir la facture (PDF)</a></div>`,
      signature: signatureArtisan(profil, nomArtisan),
    }),
    attachments: [...(await logoInline())],
  });
}
