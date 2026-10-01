import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getArtisanConnecte, createAdminSupabase } from "@/lib/supabaseServerClient";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const resultat = await getArtisanConnecte(req.headers.get("authorization"));
  if ("erreur" in resultat) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: resultat.statut });
  }

  const formData = await req.formData();
  const audio = formData.get("audio") as File;

  if (!audio) {
    return NextResponse.json({ erreur: "Aucun audio reçu" }, { status: 400 });
  }

  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model: "whisper-1",
    language: "fr",
  });

  // Compte la dictee pour le tableau de bord /admin (supabase/suivi-admin.sql).
  // Un echec est ignore : il ne doit jamais faire perdre la transcription.
  try {
    await createAdminSupabase().rpc("compter_dictee", { p_artisan_id: resultat.artisan.id });
  } catch {
    // ignore
  }

  return NextResponse.json({ texte: transcription.text });
}