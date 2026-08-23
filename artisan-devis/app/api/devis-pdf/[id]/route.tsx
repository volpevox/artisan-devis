import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminSupabase } from "@/lib/supabaseServerClient";
import { DevisPDF } from "@/lib/devisPdf";

// Le PDF change (statut, signature, facturation) apres sa premiere
// generation : ne jamais le mettre en cache, ni cote serveur ni navigateur.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminSupabase();
  const { data: devis } = await supabase.from("devis").select("*").eq("id", params.id).maybeSingle();

  if (!devis) {
    return NextResponse.json({ erreur: "Devis introuvable" }, { status: 404 });
  }

  const { data: lignes } = await supabase
    .from("lignes_devis")
    .select("*")
    .eq("devis_id", params.id)
    .order("ordre", { ascending: true });

  const { data: profil } = await supabase
    .from("artisans")
    .select("*")
    .eq("id", devis.artisan_id)
    .maybeSingle();

  const tauxTva = profil?.taux_tva ?? 20;
  const estFacture = Boolean(devis.est_facture);

  const pdfBuffer = await renderToBuffer(
    <DevisPDF
      entreprise={{
        nom: profil?.nom_entreprise,
        telephone: profil?.telephone,
        adresse: profil?.adresse,
        ville: profil?.ville,
        logoUrl: profil?.logo_url,
        siret: profil?.siret,
        numeroTva: profil?.numero_tva,
        iban: profil?.iban,
        conditionsPaiement: profil?.conditions_paiement,
        mentionsLegales: profil?.mentions_legales,
      }}
      clientNom={devis.client_nom || ""}
      clientAdresse={devis.client_adresse}
      lignes={(lignes || []).map((l) => ({
        description: l.description || "",
        quantite: l.quantite || 1,
        unite: l.unite || "forfait",
        prixUnitaire: l.prix_unitaire || 0,
      }))}
      tauxTva={tauxTva}
      date={new Date(estFacture ? devis.facture_creee_le : devis.created_at)}
      datePrestation={devis.date_prestation ? new Date(devis.date_prestation) : null}
      signatureUrl={devis.signature_url}
      signeLe={devis.signe_le ? new Date(devis.signe_le) : null}
      type={estFacture ? "facture" : "devis"}
      numero={estFacture ? devis.numero_facture : devis.numero_devis}
      paiement={{
        payeeLe: devis.payee_le ? new Date(devis.payee_le) : null,
        moyenPaiement: devis.moyen_paiement || null,
      }}
    />
  );

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${estFacture ? "facture" : "devis"}-${devis.client_nom || params.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
