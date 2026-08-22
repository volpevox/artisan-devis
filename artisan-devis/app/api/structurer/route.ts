import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabaseClient";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { texte } = await req.json();

  const { data: prixConnus } = await supabase
    .from("prix_appris")
    .select("prestation, unite, prix_moyen")
    .order("nombre_utilisations", { ascending: false })
    .limit(50);

  const listePrixConnus =
    prixConnus && prixConnus.length > 0
      ? prixConnus.map((p) => `- ${p.prestation} (par ${p.unite}) : ${p.prix_moyen} €/${p.unite}`).join("\n")
      : "(aucun prix appris pour l'instant)";

  const reponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Tu extrais les informations d'un devis dicté par un professionnel indépendant ou une petite entreprise, tous secteurs confondus (bâtiment, espaces verts, agence web, prestations de services, artisanat...). Réponds UNIQUEMENT en JSON, avec exactement ces champs :
- client (texte, vide si non mentionné)
- clientAdresse (texte, l'adresse du client si mentionnée, vide sinon)
- description (texte, le descriptif complet de la prestation tel que dicté)
- prestation (texte court désignant le type de prestation, sans détail de quantité, ex: "Peinture", "Tonte de pelouse", "Création de site web", "Dépannage informatique", "Consulting")
- quantite (nombre, la quantité de travail mentionnée : nombre de m², de mètres linéaires, d'heures, de jours, de pages, de points/unités... Si aucune quantité mesurable n'est mentionnée, mets 1)
- unite (texte, l'unité correspondant à la quantité, à choisir parmi : "m²", "ml", "heure", "jour", "unité", "forfait". Utilise "forfait" si la prestation n'est pas mesurable par quantité (ex: un forfait global), avec quantite à 1)
- prixUnitaire (nombre, le prix par unité, ou null si aucun prix n'est dicté et qu'aucune prestation connue ne correspond)
- prixPropose (booléen, true uniquement si prixUnitaire vient du carnet de prix ci-dessous plutôt que d'un montant dicté explicitement)

Voici les prix déjà appris pour ce professionnel (prestation, par unité, prix moyen par unité) :
${listePrixConnus}

Si aucun prix n'est dicté, ne propose un prixUnitaire du carnet que si une prestation de la liste correspond au même type de prestation ET à la même unité (on ne peut pas réutiliser un prix au m² pour une prestation facturée à l'heure, ni l'inverse). Si aucune prestation ne correspond avec la même unité, laisse "prixUnitaire" à null et "prixPropose" à false. Ne mets aucun texte autour du JSON.`,
      },
      { role: "user", content: texte },
    ],
  });

  const contenu = reponse.choices[0].message.content || "{}";

  try {
    const donnees = JSON.parse(contenu);
    return NextResponse.json(donnees);
  } catch {
    return NextResponse.json({
      client: "",
      clientAdresse: "",
      description: texte,
      prestation: "",
      quantite: 1,
      unite: "forfait",
      prixUnitaire: null,
      prixPropose: false,
    });
  }
}