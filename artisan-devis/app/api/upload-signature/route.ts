import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { erreur: "SUPABASE_SERVICE_ROLE_KEY manquante dans les variables d'environnement du serveur" },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

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

  const { error: erreurUpdate } = await supabaseAdmin
    .from("devis")
    .update({
      signature_url: data.publicUrl,
      signe_le: new Date().toISOString(),
      statut: "signe",
      lieu_signature: lieuSignature || null,
    })
    .eq("id", devisId);

  if (erreurUpdate) {
    return NextResponse.json({ erreur: erreurUpdate.message }, { status: 500 });
  }

  return NextResponse.json({ url: data.publicUrl });
}
