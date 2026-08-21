import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { texte } = await req.json();

  const reponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Tu extrais les informations d'un devis dicté par un artisan. Réponds UNIQUEMENT en JSON, avec exactement ces champs : client (texte, vide si non mentionné), description (texte, le descriptif des travaux), prix (nombre, vide/null si aucun prix n'est mentionné). Ne mets aucun texte autour du JSON.",
      },
      { role: "user", content: texte },
    ],
  });

  const contenu = reponse.choices[0].message.content || "{}";

  try {
    const donnees = JSON.parse(contenu);
    return NextResponse.json(donnees);
  } catch {
    return NextResponse.json({ client: "", description: texte, prix: null });
  }
}