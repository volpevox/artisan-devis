import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getArtisanConnecte, createAdminSupabase } from "@/lib/supabaseServerClient";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Indice donne a Whisper : oriente vers le vocabulaire d'un devis quand un
// mot est ambigu (« a Lyon » transcrit « a Leon », « 3 rue » en « trois
// rues », « plinthes » en « plaintes »). Teste le 03/10 : les modeles
// gpt-4o(-mini)-transcribe recopient l'indice sur un enregistrement muet,
// whisper-1 non (il garde ses hallucinations connues, filtrees par
// rienDicte dans app/page.tsx).
const INDICE_DICTEE =
  "Devis d'artisan dicté : nom du client, adresse (rue, code postal, ville : Lyon, Paris, Marseille, Lille, Bordeaux…), prestations (plinthes, carrelage, tableau électrique…), quantités en m², mètres linéaires, heures ou au forfait, prix en euros.";

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
    prompt: INDICE_DICTEE,
  });
  // Securite : si l'indice ressort tel quel (enregistrement muet), on
  // renvoie un texte vide -> « rien entendu » cote appli.
  const texte = /code postal, ville|Devis d'artisan dicté/i.test(transcription.text) ? "" : transcription.text;

  // Compte la dictee pour le tableau de bord /admin (supabase/suivi-admin.sql).
  // Un echec est ignore : il ne doit jamais faire perdre la transcription.
  try {
    await createAdminSupabase().rpc("compter_dictee", { p_artisan_id: resultat.artisan.id });
  } catch {
    // ignore
  }

  return NextResponse.json({ texte });
}