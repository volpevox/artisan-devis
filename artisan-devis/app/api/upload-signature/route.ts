import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminSupabase } from "@/lib/supabaseServerClient";
import { emailHtml } from "@/lib/emailTemplate";
import { envoyerNotificationPush } from "@/lib/pushNotifications";

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
    .select("artisan_id, client_nom, numero_devis")
    .maybeSingle();

  if (erreurUpdate) {
    return NextResponse.json({ erreur: erreurUpdate.message }, { status: 500 });
  }

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
        .select("user_id")
        .eq("id", devisSigne.artisan_id)
        .maybeSingle();

      if (artisan?.user_id) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(artisan.user_id);
        const emailArtisan = userData?.user?.email;

        if (emailArtisan) {
          await resend.emails.send({
            from: "VolpeVox <devis@volpevox.fr>",
            to: emailArtisan,
            subject: `${devisSigne.client_nom || "Un client"} a signé son devis${devisSigne.numero_devis ? ` n°${devisSigne.numero_devis}` : ""} !`,
            html: emailHtml({
              titre: "Devis signé !",
              corpsHtml: `<p>${devisSigne.client_nom || "Votre client"} vient de signer son devis${devisSigne.numero_devis ? ` n°${devisSigne.numero_devis}` : ""}.</p>`,
              boutonUrl: `${req.nextUrl.origin}/api/devis-pdf/${devisId}`,
              boutonTexte: "Voir le devis signé",
            }),
          });
        }
      }
    } catch {
      // La signature du client est deja enregistree : un echec de
      // notification ne doit pas faire echouer la reponse.
    }
  }

  return NextResponse.json({ url: data.publicUrl });
}
