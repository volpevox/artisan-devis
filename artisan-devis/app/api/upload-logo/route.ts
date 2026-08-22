import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const fichier = formData.get("logo") as File;

  if (!fichier) {
    return NextResponse.json({ erreur: "Aucun fichier reçu" }, { status: 400 });
  }

  const extension = fichier.name.split(".").pop();
  const nomFichier = `logo-${Date.now()}.${extension}`;

  const { error: erreurUpload } = await supabaseAdmin.storage
    .from("logos")
    .upload(nomFichier, fichier, { upsert: true, contentType: fichier.type });

  if (erreurUpload) {
    return NextResponse.json({ erreur: erreurUpload.message }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from("logos").getPublicUrl(nomFichier);

  return NextResponse.json({ url: data.publicUrl });
}
