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

  // Date du jour, pour transformer « lundi », « demain »... en vraie date.
  const aujourdhui = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });

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
- clientType ("professionnel" si le client est une entreprise, une société, un commerce, une association, une collectivité ou un professionnel qui achète pour son activité ; "particulier" sinon, y compris quand rien ne permet de le savoir)
- clientSiren (texte, le numéro SIREN ou SIRET du client s'il est dicté, chiffres seulement, vide sinon)
- clientAdresse (texte, l'adresse du client si mentionnée, vide sinon. Si une seule adresse est dictée, c'est celle-ci)
- adressePrestation (texte, l'adresse du lieu de la prestation SEULEMENT si la dictée indique clairement qu'elle est différente de l'adresse du client, ex : « il habite à Lyon mais c'est pour sa maison d'Annecy, 3 rue du Lac ». Vide sinon)
- debutPrestation (texte, la date ou période de début de la prestation si elle est dictée, vide sinon. Nous sommes le ${aujourdhui} : une date relative devient une date complète (« lundi » = le prochain lundi, ex : « lundi 6 octobre 2026 » ; « demain » = la date de demain). Une période vague reste telle quelle (« début novembre », « semaine prochaine » devient « semaine du 6 octobre 2026 »))
- dureePrestation (texte court, la durée estimée de la prestation si elle est dictée, ex : « 3 jours », « une demi-journée », « 2 semaines ». Vide sinon. Ne la déduis JAMAIS des quantités d'heures ou de jours facturées)
- clientEmail (texte, l'adresse email du client si elle est dictée, reconstituée sans espaces : « arobase » ou « at » = @, « point » = ., « tiret » = -, « tiret du bas » = _ ; ex : « marie point dupont arobase gmail point com » = marie.dupont@gmail.com. Vide si aucun email n'est dicté ; n'en invente jamais)
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
    // Malgre la consigne, l'IA met parfois « Madame » en prenom : la civilite
    // passe devant le nom (« Mme Martin ») au lieu d'etre un faux prenom.
    const civilites: Record<string, string> = { madame: "Mme", mme: "Mme", monsieur: "M.", "m.": "M.", mademoiselle: "Mlle", mlle: "Mlle" };
    const civilite = civilites[String(donnees.clientPrenom || "").trim().toLowerCase()];
    if (civilite) {
      donnees.clientPrenom = "";
      donnees.clientNom = [civilite, donnees.clientNom].filter(Boolean).join(" ");
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
      clientType: "particulier",
      clientSiren: "",
      clientAdresse: "",
      adressePrestation: "",
      debutPrestation: "",
      dureePrestation: "",
      clientEmail: "",
      lignes: [ligneParDefaut],
    });
  }
}