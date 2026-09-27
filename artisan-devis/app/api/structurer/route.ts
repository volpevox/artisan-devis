import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getArtisanConnecte } from "@/lib/supabaseServerClient";
import { finaliserLigneIA } from "@/lib/majorations";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { texte } = await req.json();

  const resultat = await getArtisanConnecte(req.headers.get("authorization"));
  if ("erreur" in resultat) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: resultat.statut });
  }
  const { supabase, artisan } = resultat;

  const { data: prixConnus } = await supabase
    .from("prix_appris")
    .select("prestation, unite, prix_moyen")
    .eq("artisan_id", artisan.id)
    .order("fixe", { ascending: false })
    .order("nombre_utilisations", { ascending: false })
    .limit(50);

  const listePrixConnus =
    prixConnus && prixConnus.length > 0
      ? prixConnus.map((p) => `- ${p.prestation} (par ${p.unite}) : ${p.prix_moyen} €/${p.unite}`).join("\n")
      : "(aucun prix appris pour l'instant)";

  const reponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    // Meme dictee = meme resultat (sans ca l'IA hesite d'un essai a l'autre,
    // notamment sur les conditions nuit / dimanche / ferie).
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Tu extrais les informations d'un devis dicté par un professionnel indépendant ou une petite entreprise, tous secteurs confondus (bâtiment, espaces verts, agence web, prestations de services, artisanat...). Réponds UNIQUEMENT en JSON, avec exactement ces champs :
- clientPrenom (texte, le prénom du client si mentionné, vide sinon. Une civilité — Monsieur, Madame, M., Mme, Mlle — n'est JAMAIS un prénom : « Monsieur Martin » donne clientPrenom vide et clientNom "Martin")
- clientNom (texte, le nom de famille du client si mentionné, vide sinon)
- clientRaisonSociale (texte, le nom de l'entreprise / raison sociale du client si le client est une société, vide sinon)
- clientTelephone (texte, le numéro de téléphone du client si mentionné, vide sinon)
- clientAdresse (texte, l'adresse du client si mentionnée, vide sinon)
- lignes (tableau d'objets) : une entrée par prestation DISTINCTE mentionnée dans la dictée. Si la dictée ne décrit qu'une seule prestation, renvoie un tableau avec une seule entrée. Ne sépare en plusieurs lignes que des tâches réellement différentes (pas un simple découpage artificiel d'une même tâche). EXCEPTION : une même prestation réalisée dans des conditions différentes (de jour, de nuit, un dimanche, un jour férié) donne une ligne par condition, avec sa propre quantité (ex : "120 heures de nuit et 16 heures un dimanche" = 2 lignes). Chaque entrée contient :
  - description (texte, le descriptif de cette prestation tel que dicté)
  - prestation (texte court désignant le type de prestation, sans détail de quantité, ex: "Peinture", "Tonte de pelouse", "Création de site web", "Dépannage informatique", "Consulting"). Reprends le nom exact d'une prestation du carnet seulement si c'est vraiment la même prestation ; sinon, nomme-la d'après la dictée (ex : "Main-d'œuvre" n'est pas "Agent de sécurité"))
  - quantite (nombre, la quantité de travail mentionnée pour cette prestation : nombre de m², de mètres linéaires, d'heures, de jours, de pages, de points/unités... Si aucune quantité mesurable n'est mentionnée, mets 1)
  - unite (texte, l'unité correspondant à la quantité, à choisir parmi : "m²", "ml", "heure", "jour", "unité", "forfait". Utilise "forfait" si la prestation n'est pas mesurable par quantité (ex: un forfait global), avec quantite à 1)
  - prixDicte (nombre ou null) : le prix unitaire PRONONCÉ dans la dictée pour CETTE ligne (ex : "à 40 euros" → 40, "35 euros de l'heure la nuit" → 35). null si aucun prix n'est prononcé pour cette ligne. Ne mets JAMAIS ici un prix du carnet.  - prixCarnet (nombre ou null) : uniquement si prixDicte est null, le prix du carnet ci-dessous pour une prestation du MÊME type ET de la MÊME unité (voir règles plus bas). null sinon.
  - majorations (tableau, parmi "nuit", "dimanche", "ferie") : les conditions de cette ligne qui donnent droit à une majoration. "nuit" = travail de nuit. "dimanche" = un dimanche. "ferie" = un jour férié français (1er janvier, lundi de Pâques, 1er mai, 8 mai, Ascension, lundi de Pentecôte, 14 juillet, 15 août, 1er novembre, 11 novembre, 25 décembre, ou "jour férié" dit tel quel). Mets TOUTES les conditions de la ligne (ex : une nuit de dimanche = ["nuit", "dimanche"] ; la nuit du 25 décembre = ["ferie", "nuit"]). Tableau vide si aucune condition. Ne calcule jamais de majoration toi-même : les prix restent ceux prononcés ou ceux du carnet, sans modification.

Voici les prix déjà appris pour ce professionnel (prestation, par unité, prix moyen par unité) :
${listePrixConnus}

Règles pour prixCarnet : ne reprends un prix du carnet que si la prestation de la ligne est du même type qu'une prestation de la liste (un agent de sécurité n'est pas de la main-d'œuvre de carreleur, même si les deux sont à l'heure) ET a la même unité (un prix au m² ne sert pas pour une prestation à l'heure, ni l'inverse). Recopie exactement le prix indiqué dans la liste, sans calcul, conversion ou moyenne. En cas de doute, mets null : l'utilisateur complétera. Ne mets aucun texte autour du JSON.`,
      },
      { role: "user", content: texte },
    ],
  });

  const contenu = reponse.choices[0].message.content || "{}";
  const ligneParDefaut = { description: texte, prestation: "", quantite: 1, unite: "forfait", prixUnitaire: null, prixPropose: false };

  try {
    const donnees = JSON.parse(contenu);
    if (!Array.isArray(donnees.lignes) || donnees.lignes.length === 0) {
      donnees.lignes = [ligneParDefaut];
    }
    // Choix du prix (dicte > carnet) et majorations faits ici, pas par l'IA.
    donnees.lignes = donnees.lignes.map((l: any) => finaliserLigneIA(l, artisan));
    return NextResponse.json(donnees);
  } catch {
    return NextResponse.json({
      clientPrenom: "",
      clientNom: "",
      clientRaisonSociale: "",
      clientTelephone: "",
      clientAdresse: "",
      lignes: [ligneParDefaut],
    });
  }
}