import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabaseServerClient";
import { estAdmin } from "@/lib/admin";
import { familleProvenance } from "@/lib/provenance";

export const dynamic = "force-dynamic";

// Tableau de bord prive de Marley (page /admin).
//
// Securite : estAdmin() verifie cote serveur que la session est celle de
// ADMIN_EMAIL. Sinon : 403 et AUCUNE donnee. La cle de service (qui lit tous
// les comptes) n'est utilisee qu'ici, sur le serveur, jamais envoyee au
// navigateur.
//
//   GET /api/admin?verif=1     -> { admin: true } (tuile dans Parametres)
//   GET /api/admin             -> chiffres cles, entonnoir, liste des comptes
//   GET /api/admin?compte=ID   -> detail d'un compte (ses documents)
//
// Le compte de Marley lui-meme est exclu des chiffres (ses tests les
// fausseraient).

const JOUR = 24 * 60 * 60 * 1000;

// Jour calendaire a l'heure de Paris (AAAA-MM-JJ), pour le graphique.
function jourParis(d: Date) {
  return d.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
}

function plusRecent(...dates: (string | null | undefined)[]) {
  let max: string | null = null;
  for (const d of dates) if (d && (!max || d > max)) max = d;
  return max;
}

// Lit toute une table par paquets de 1000 (limite de l'API Supabase).
async function toutLire<T>(requete: (de: number, a: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const lignes: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await requete(de, de + 999);
    if (error) throw error;
    lignes.push(...(data || []));
    if (!data || data.length < 1000) return lignes;
  }
}

type Devis = {
  id: string;
  artisan_id: string;
  statut: string | null;
  total: number | null;
  created_at: string;
  envoye_le: string | null;
  signe_le: string | null;
  est_facture: boolean | null;
  facture_creee_le: string | null;
  facture_envoyee_le: string | null;
  payee_le: string | null;
  moyen_paiement: string | null;
  numero_devis: string | null;
  numero_facture: string | null;
  avoir_numero: string | null;
};

const COLONNES_DEVIS =
  "id, artisan_id, statut, total, created_at, envoye_le, signe_le, est_facture, facture_creee_le, facture_envoyee_le, payee_le, moyen_paiement, numero_devis, numero_facture, avoir_numero";

const estEnvoye = (d: Devis) => Boolean(d.envoye_le || d.statut === "envoye" || d.statut === "signe" || d.facture_envoyee_le);
const estSigne = (d: Devis) => Boolean(d.signe_le || d.statut === "signe");
const estPayeEnLigne = (d: Devis) => Boolean(d.payee_le && /en ligne/i.test(d.moyen_paiement || ""));

export async function GET(req: NextRequest) {
  if (!(await estAdmin(req.headers.get("authorization")))) {
    return NextResponse.json({ erreur: "Accès refusé" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  if (params.get("verif")) return NextResponse.json({ admin: true });

  const db = createAdminSupabase();

  // Detail d'un compte : ses documents, du plus recent au plus ancien.
  const compte = params.get("compte");
  if (compte) {
    const { data, error } = await db
      .from("devis")
      .select(COLONNES_DEVIS)
      .eq("artisan_id", compte)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ erreur: "Lecture impossible" }, { status: 500 });
    return NextResponse.json({ documents: data });
  }

  try {
    // Comptes (auth Supabase) : date d'inscription, mode de connexion.
    const utilisateurs: any[] = [];
    for (let page = 1; ; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      utilisateurs.push(...data.users);
      if (data.users.length < 1000) break;
    }

    // select("*") : les colonnes de suivi (supabase/suivi-admin.sql) sont lues
    // si elles existent, sans casser la page si le SQL n'a pas encore ete joue.
    const artisans = await toutLire<any>((de, a) => db.from("artisans").select("*").range(de, a));
    const devis = await toutLire<Devis>((de, a) => db.from("devis").select(COLONNES_DEVIS).range(de, a));
    const abonnementsPush = await toutLire<{ artisan_id: string }>((de, a) =>
      db.from("push_subscriptions").select("artisan_id").range(de, a)
    );

    const emailAdmin = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const maintenant = Date.now();

    const artisanParUser = new Map<string, any>(artisans.map((a) => [a.user_id, a]));
    const devisParArtisan = new Map<string, Devis[]>();
    for (const d of devis) {
      const liste = devisParArtisan.get(d.artisan_id) || [];
      liste.push(d);
      devisParArtisan.set(d.artisan_id, liste);
    }
    const avecNotifs = new Set(abonnementsPush.map((p) => p.artisan_id));

    const comptes = utilisateurs
      .filter((u) => (u.email || "").toLowerCase() !== emailAdmin)
      .map((u) => {
        const a = artisanParUser.get(u.id) || null;
        const docs: Devis[] = (a && devisParArtisan.get(a.id)) || [];
        const devisSeuls = docs.filter((d) => !d.est_facture || d.numero_devis);
        const factures = docs.filter((d) => d.est_facture);
        const premierDoc = docs.reduce<string | null>((min, d) => (!min || d.created_at < min ? d.created_at : min), null);
        const semaines = new Set(docs.map((d) => Math.floor(new Date(d.created_at).getTime() / (7 * JOUR))));

        const derniereActivite = plusRecent(
          u.last_sign_in_at,
          a?.derniere_ouverture_le,
          a?.derniere_dictee_le,
          ...docs.map((d) => plusRecent(d.created_at, d.envoye_le, d.facture_envoyee_le))
        );

        const inscritLe: string = u.created_at;
        const joursDepuisInscription = Math.floor((maintenant - new Date(inscritLe).getTime()) / JOUR);
        const joursInactif = derniereActivite
          ? Math.floor((maintenant - new Date(derniereActivite).getTime()) / JOUR)
          : joursDepuisInscription;

        // Badge : Nouveau (< 7 jours) > Jamais utilise (aucun devis ni dictee)
        // > Actif (activite < 14 jours) > Inactif depuis X jours.
        let statut: "nouveau" | "jamais" | "actif" | "inactif";
        if (joursDepuisInscription < 7) statut = "nouveau";
        else if (docs.length === 0 && !(a?.nb_dictees > 0)) statut = "jamais";
        else if (joursInactif < 14) statut = "actif";
        else statut = "inactif";

        return {
          userId: u.id,
          artisanId: a?.id || null,
          email: u.email || "",
          connexion: (u.app_metadata?.provider as string) || "email",
          entreprise: a?.nom_entreprise || null,
          nom: a?.nom_complet || null,
          telephone: a?.telephone || null,
          ville: a?.ville || null,
          inscritLe,
          derniereActivite,
          derniereOuverture: a?.derniere_ouverture_le || null,
          joursInactif,
          statut,
          profilRempli: Boolean(a?.siret && a?.code_postal && a?.telephone),
          nbDevis: devisSeuls.length,
          nbEnvoyes: devisSeuls.filter(estEnvoye).length,
          nbSignes: devisSeuls.filter(estSigne).length,
          nbFactures: factures.length,
          montantDevis: devisSeuls.reduce((s, d) => s + (Number(d.total) || 0), 0),
          montantSigne: devisSeuls.filter(estSigne).reduce((s, d) => s + (Number(d.total) || 0), 0),
          premierDevisLe: premierDoc,
          semainesActives: semaines.size,
          logo: Boolean(a?.logo_url),
          paiementEnLigne: Boolean(a?.stripe_paiement_actif),
          notifications: Boolean(a && avecNotifs.has(a.id)),
          nbDictees: Number(a?.nb_dictees) || 0,
          premiereDicteeLe: a?.premiere_dictee_le || null,
          provenance: familleProvenance(a?.provenance_source, a?.provenance_referent),
          provenanceDetail: [a?.provenance_source, a?.provenance_medium, a?.provenance_campagne, a?.provenance_referent]
            .filter(Boolean)
            .join(" · "),
        };
      })
      .sort((x, y) => (x.inscritLe < y.inscritLe ? 1 : -1));

    // Les documents des comptes exclus (Marley) ne comptent pas non plus.
    const artisansComptes = new Set(comptes.map((c) => c.artisanId).filter(Boolean));
    const docsComptes = devis.filter((d) => artisansComptes.has(d.artisan_id));

    const inscritDepuis = (jours: number) =>
      comptes.filter((c) => maintenant - new Date(c.inscritLe).getTime() < jours * JOUR).length;
    const aujourdhui = jourParis(new Date());
    const actifsDepuis = (jours: number) =>
      comptes.filter((c) => c.derniereActivite && maintenant - new Date(c.derniereActivite).getTime() < jours * JOUR).length;

    // Inscriptions par jour, 30 derniers jours (heure de Paris).
    const parJour: { jour: string; inscrits: number; devis: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      parJour.push({ jour: jourParis(new Date(maintenant - i * JOUR)), inscrits: 0, devis: 0 });
    }
    const indexJour = new Map(parJour.map((j, i) => [j.jour, i]));
    for (const c of comptes) {
      const i = indexJour.get(jourParis(new Date(c.inscritLe)));
      if (i !== undefined) parJour[i].inscrits++;
    }
    for (const d of docsComptes) {
      const i = indexJour.get(jourParis(new Date(d.created_at)));
      if (i !== undefined) parJour[i].devis++;
    }

    // Delai median entre inscription et 1er document.
    const delais = comptes
      .filter((c) => c.premierDevisLe)
      .map((c) => (new Date(c.premierDevisLe!).getTime() - new Date(c.inscritLe).getTime()) / (60 * 60 * 1000))
      .sort((x, y) => x - y);
    const delaiMedianHeures = delais.length ? delais[Math.floor(delais.length / 2)] : null;

    const provenances: Record<string, number> = {};
    for (const c of comptes) provenances[c.provenance] = (provenances[c.provenance] || 0) + 1;

    const devisSeuls = docsComptes.filter((d) => !d.est_facture || d.numero_devis);
    const factures = docsComptes.filter((d) => d.est_facture);
    const somme = (l: Devis[]) => l.reduce((s, d) => s + (Number(d.total) || 0), 0);

    return NextResponse.json({
      genereLe: new Date().toISOString(),
      chiffres: {
        inscrits: comptes.length,
        inscritsAujourdhui: comptes.filter((c) => jourParis(new Date(c.inscritLe)) === aujourdhui).length,
        inscrits7j: inscritDepuis(7),
        inscrits30j: inscritDepuis(30),
        comptesActifs: comptes.filter((c) => c.nbDevis + c.nbFactures > 0).length,
        actifs7j: actifsDepuis(7),
        actifs30j: actifsDepuis(30),
        revenus: comptes.filter((c) => c.semainesActives >= 2).length,
        devis: devisSeuls.length,
        devisEnvoyes: devisSeuls.filter(estEnvoye).length,
        devisSignes: devisSeuls.filter(estSigne).length,
        factures: factures.length,
        facturesPayees: factures.filter((d) => d.payee_le).length,
        dictees: comptes.reduce((s, c) => s + c.nbDictees, 0),
        montantDevis: somme(devisSeuls),
        montantSigne: somme(devisSeuls.filter(estSigne)),
        montantFacture: somme(factures),
        montantPayeEnLigne: somme(factures.filter(estPayeEnLigne)),
        delaiMedianHeures,
      },
      entonnoir: [
        { etape: "Inscrit", nb: comptes.length },
        { etape: "Profil rempli", nb: comptes.filter((c) => c.profilRempli).length },
        { etape: "1er devis créé", nb: comptes.filter((c) => c.nbDevis + c.nbFactures > 0).length },
        { etape: "Devis envoyé", nb: comptes.filter((c) => c.nbEnvoyes > 0).length },
        { etape: "Devis signé", nb: comptes.filter((c) => c.nbSignes > 0).length },
        { etape: "Facture", nb: comptes.filter((c) => c.nbFactures > 0).length },
      ],
      parJour,
      provenances,
      comptes,
    });
  } catch (e) {
    console.error("admin:", e);
    return NextResponse.json({ erreur: "Lecture des données impossible" }, { status: 500 });
  }
}
