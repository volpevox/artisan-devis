import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getArtisanConnecte } from "@/lib/supabaseServerClient";
import { DevisPDF } from "@/lib/devisPdf";
import { nomAffichageDocument } from "@/lib/nomAffichage";

// Aperçu PDF d'un devis / d'une facture PAS ENCORE enregistré : on rend le
// même document que /api/devis-pdf/[id], mais à partir des champs du
// formulaire (envoyés dans le corps) plutôt que d'une ligne en base. Rien
// n'est écrit ; le profil de l'artisan est relu pour l'en-tête.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const resultat = await getArtisanConnecte(req.headers.get("authorization"));
  if ("erreur" in resultat) {
    return NextResponse.json({ erreur: resultat.erreur }, { status: resultat.statut });
  }
  const { artisan } = resultat;

  const body = await req.json().catch(() => ({}));
  const estFacture = body.type === "facture";
  const tauxTva = artisan?.taux_tva ?? 20;

  const lignes = (Array.isArray(body.lignes) ? body.lignes : []).map((l: any) => ({
    description: l?.description || "",
    quantite: Number(l?.quantite) || 0,
    unite: l?.unite || "forfait",
    prixUnitaire: Number(l?.prixUnitaire) || 0,
  }));

  const datePrestation =
    estFacture && body.datePrestation ? new Date(body.datePrestation) : null;

  // Numero qui sera attribue au document s'il est enregistre maintenant :
  // valeur actuelle du compteur de l'artisan (rien n'est reserve, l'apercu
  // ne consomme pas le numero).
  const prochainNumero = estFacture
    ? Number(artisan?.prochain_numero_facture) || 1
    : Number(artisan?.prochain_numero_devis) || 1;

  const pdfBuffer = await renderToBuffer(
    <DevisPDF
      entreprise={{
        nom: nomAffichageDocument(artisan),
        telephone: artisan?.telephone,
        adresse: artisan?.adresse,
        codePostal: artisan?.code_postal,
        ville: artisan?.ville,
        logoUrl: artisan?.logo_url,
        siret: artisan?.siret,
        numeroTva: artisan?.numero_tva,
        iban: artisan?.iban,
        conditionsPaiement: artisan?.conditions_paiement,
        assurancePro: artisan?.assurance_pro,
        mediateurConso: artisan?.mediateur_conso,
        validiteJours: artisan?.duree_validite_devis,
        penalitesRetard: artisan?.penalites_retard,
      }}
      clientNom={body.clientNom || ""}
      clientAdresse={body.clientAdresse || null}
      clientTelephone={body.clientTelephone || null}
      lignes={lignes}
      tauxTva={tauxTva}
      date={new Date()}
      signatureUrl={null}
      signeLe={null}
      lieuSignature={null}
      type={estFacture ? "facture" : "devis"}
      numero={prochainNumero}
      paiement={estFacture ? { payeeLe: null, moyenPaiement: body.modePaiement || null } : null}
      datePrestation={datePrestation}
    />
  );

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="apercu-${estFacture ? "facture" : "devis"}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
