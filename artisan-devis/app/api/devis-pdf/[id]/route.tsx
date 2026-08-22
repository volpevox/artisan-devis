import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { supabase } from "@/lib/supabaseClient";
import { DevisPDF } from "@/lib/devisPdf";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { data: devis } = await supabase.from("devis").select("*").eq("id", params.id).maybeSingle();

  if (!devis) {
    return NextResponse.json({ erreur: "Devis introuvable" }, { status: 404 });
  }

  const { data: ligne } = await supabase
    .from("lignes_devis")
    .select("*")
    .eq("devis_id", params.id)
    .limit(1)
    .maybeSingle();

  const { data: profil } = await supabase.from("artisans").select("*").limit(1).maybeSingle();

  const tauxTva = profil?.taux_tva ?? 20;
  const totalHT = ligne?.total_ligne ?? devis.total ?? 0;

  const pdfBuffer = await renderToBuffer(
    <DevisPDF
      entreprise={{
        nom: profil?.nom_entreprise,
        telephone: profil?.telephone,
        adresse: profil?.adresse,
        logoUrl: profil?.logo_url,
        siret: profil?.siret,
        numeroTva: profil?.numero_tva,
        iban: profil?.iban,
        conditionsPaiement: profil?.conditions_paiement,
        mentionsLegales: profil?.mentions_legales,
      }}
      clientNom={devis.client_nom || ""}
      clientAdresse={devis.client_adresse}
      description={ligne?.description || ""}
      quantite={ligne?.quantite || 1}
      unite={ligne?.unite || "forfait"}
      prixUnitaire={ligne?.prix_unitaire || totalHT}
      totalHT={totalHT}
      tauxTva={tauxTva}
      date={new Date(devis.created_at)}
      signatureUrl={devis.signature_url}
      signeLe={devis.signe_le ? new Date(devis.signe_le) : null}
    />
  );

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="devis-${devis.client_nom || params.id}.pdf"`,
    },
  });
}
