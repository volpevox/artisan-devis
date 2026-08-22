import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabaseClient";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { texte } = await req.json();

  const { data: prixConnus } = await supabase
    .from("prix_appris")
    .select("prestation, prix_moyen")
    .order("nombre_utilisations", { ascending: false })
    .limit(50);

  const listePrixConnus =
    prixConnus && prixConnus.length > 0
      ? prixConnus.map((p) => `- ${p.prestation} : ${p.prix_moyen} €`).join("\n")
      : "(aucun prix appris pour l'instant)";

  const reponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Tu extrais les informations d'un devis dicté par un artisan. Réponds UNIQUEMENT en JSON, avec exactement ces champs :
- client (texte, vide si non mentionné)
- description (texte, le descriptif complet des travaux tel que dicté)
- prestation (texte court de 2 à 5 mots résumant le type de prestation principal, ex: "Pose de parquet", "Peinture plafond")
- prix (nombre, ou null si aucun prix n'est mentionné et qu'aucune prestation connue ne correspond)
- prixPropose (booléen, true uniquement si le prix vient du carnet de prix ci-dessous plutôt que d'un montant dicté explicitement)

Voici les prix déjà appris pour cet artisan (prestation : prix moyen) :
${listePrixConnus}

Si l'artisan ne dicte aucun prix mais qu'une prestation de la liste correspond à ce qu'il décrit, utilise ce prix moyen comme valeur de "prix" et mets "prixPropose" à true. Sinon laisse "prix" à null et "prixPropose" à false. Ne mets aucun texte autour du JSON.`,
      },
      { role: "user", content: texte },
    ],
  });

  const contenu = reponse.choices[0].message.content || "{}";

  try {
    const donnees = JSON.parse(contenu);
    return NextResponse.json(donnees);
  } catch {
    return NextResponse.json({ client: "", description: texte, prestation: "", prix: null, prixPropose: false });
  }
}