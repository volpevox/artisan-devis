import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminSupabase } from "@/lib/supabaseServerClient";
import { echapperHtml, emailHtml, formaterEuros, logoInline, totauxTicket } from "@/lib/emailTemplate";
import { envoyerNotificationPush } from "@/lib/pushNotifications";
import { acompteDepuisPourcentage, pourcentageAcompte } from "@/lib/acompte";
import { creerAcompte, envoyerAcompte } from "@/lib/acompteServeur";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { erreur: "SUPABASE_SERVICE_ROLE_KEY manquante dans les variables d'environnement du serveur" },
      { status: 500 }
    );
  }

  const supabaseAdmin = createAdminSupabase();

  const { devisId, signatureDataUrl, lieuSignature } = await req.json();

  if (!devisId || !signatureDataUrl) {
    return NextResponse.json({ erreur: "devisId et signatureDataUrl requis" }, { status: 400 });
  }

  const base64 = signatureDataUrl.split(",")[1];
  const buffer = Buffer.from(base64, "base64");
  const nomFichier = `signature-${devisId}.png`;

  const { error: erreurUpload } = await supabaseAdmin.storage
    .from("signatures")
    .upload(nomFichier, buffer, { upsert: true, contentType: "image/png" });

  if (erreurUpload) {
    return NextResponse.json({ erreur: erreurUpload.message }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from("signatures").getPublicUrl(nomFichier);

  const { error: erreurUpdate, data: devisSigne } = await supabaseAdmin
    .from("devis")
    .update({
      signature_url: data.publicUrl,
      signe_le: new Date().toISOString(),
      statut: "signe",
      lieu_signature: lieuSignature || null,
    })
    .eq("id", devisId)
    .select("*")
    .maybeSingle();

  if (erreurUpdate) {
    return NextResponse.json({ erreur: erreurUpdate.message }, { status: 500 });
  }

  // Facture d'acompte creee d'office a la signature (lib/acompteServeur.tsx).
  let acompte: { numero: number; montant: number } | null = null;

  // Previent l'artisan par email et par notification push des qu'un client
  // signe.
  if (devisSigne?.artisan_id) {
    await envoyerNotificationPush(devisSigne.artisan_id, {
      titre: "Devis signé !",
      corps: `${devisSigne.client_nom || "Un client"} a signé son devis${devisSigne.numero_devis ? ` n°${devisSigne.numero_devis}` : ""}.`,
      url: "/devis",
    });

    try {
      const { data: artisan } = await supabaseAdmin
        .from("artisans")
        .select("*")
        .eq("id", devisSigne.artisan_id)
        .maybeSingle();

      if (artisan?.user_id) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(artisan.user_id);
        const emailArtisan = userData?.user?.email;

        // Conditions de paiement de l'artisan qui annoncent un acompte
        // (« Acompte 30 % à la commande ») : la facture d'acompte part tout
        // de suite, et le client peut la payer sur la page ou il vient de
        // signer. Sans pourcentage : rien, l'artisan peut la demander a la main.
        const pct = pourcentageAcompte(artisan.conditions_paiement);
        if (pct && !devisSigne.acompte_numero) {
          const taux = Number(artisan.taux_tva ?? 20);
          const creation = await creerAcompte(
            supabaseAdmin,
            devisSigne,
            taux,
            acompteDepuisPourcentage(devisSigne.total, pct, taux),
            pct
          );
          if ("numero" in creation) {
            acompte = { numero: creation.numero, montant: Number(devisSigne.acompte_montant) || 0 };
            await envoyerAcompte({ devis: devisSigne, profil: artisan, emailArtisan, origin: req.nextUrl.origin });
          }
        }

        if (emailArtisan) {
          const client = echapperHtml(devisSigne.client_nom) || "Ton client";
          const numero = devisSigne.numero_devis ? ` n°${devisSigne.numero_devis}` : "";
          const total = totauxTicket(Number(devisSigne.total) || 0, Number(artisan.taux_tva ?? 20));
          const quand = new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
          await resend.emails.send({
            from: "VolpeVox <devis@volpevox.fr>",
            to: emailArtisan,
            subject: `🎉 ${devisSigne.client_nom || "Un client"} a signé ton devis${numero} !`,
            html: emailHtml({
              titre: `🎉 ${client} a signé ton devis${numero} !`,
              corpsHtml: `
                <div style="background:#f8f6ef;border:1px solid #ece4c8;border-radius:10px;padding:14px 16px;margin:0 0 16px;">
                  <div style="font-size:13px;color:#56606e;">Devis${numero} · signé le ${quand}${
                    lieuSignature ? ` à ${echapperHtml(lieuSignature)}` : ""
                  }</div>
                  <div style="font-size:22px;font-weight:800;color:#0b2a5b;margin-top:4px;">${total.total}${
                    total.totalLibelle === "Total TTC" ? ` <span style="font-size:13px;font-weight:400;color:#56606e;">TTC</span>` : ""
                  }</div>
                </div>
                <p style="margin:0 0 12px;">Bravo, c'est validé ! Le devis signé est enregistré dans VolpeVox.</p>${
                  acompte
                    ? `<p style="margin:0 0 12px;">La <strong>facture d'acompte n°${acompte.numero}</strong> (${formaterEuros(acompte.montant)}) est partie automatiquement ${
                        devisSigne.client_email ? "à ton client" : "(pas d'email client : partage-la depuis tes devis)"
                      }, comme prévu dans tes conditions de paiement.</p>`
                    : ""
                }
                <p style="margin:0 0 4px;"><strong>Prochaine étape :</strong> une fois le travail fait, ouvre tes devis et appuie sur <strong>« Transformer en facture »</strong>, puis envoie-la depuis l'onglet <strong>Factures</strong>.</p>
                <p style="margin:12px 0 0;"><a href="${req.nextUrl.origin}/api/devis-pdf/${devisId}" style="color:#0b2a5b;font-weight:700;">Voir le devis signé (PDF)</a></p>
              `,
            }),
            attachments: [...(await logoInline())],
          });
        }
      }
    } catch {
      // La signature du client est deja enregistree : un echec de
      // notification ne doit pas faire echouer la reponse.
    }
  }

  return NextResponse.json({
    url: data.publicUrl,
    // La page du client affiche tout de suite « Payer l'acompte ».
    acompte: acompte
      ? {
          acompte_numero: devisSigne?.acompte_numero,
          acompte_montant: devisSigne?.acompte_montant,
          acompte_pourcentage: devisSigne?.acompte_pourcentage,
          acompte_cree_le: devisSigne?.acompte_cree_le,
        }
      : null,
  });
}
