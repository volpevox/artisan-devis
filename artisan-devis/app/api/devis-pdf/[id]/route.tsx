import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminSupabase } from "@/lib/supabaseServerClient";
import { DevisPDF } from "@/lib/devisPdf";
import { nomAffichageDocument, mentionSociete } from "@/lib/nomAffichage";
import { acompteDeduit, pdfAcompte } from "@/lib/acompte";

// Le PDF change (statut, signature, facturation) apres sa premiere
// generation : ne jamais le mettre en cache, ni cote serveur ni navigateur.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminSupabase();
  // Devis et lignes lus en parallele (un aller-retour vers la base de moins).
  const [{ data: devis }, { data: lignes }] = await Promise.all([
    supabase.from("devis").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("lignes_devis").select("*").eq("devis_id", params.id).order("ordre", { ascending: true }),
  ]);

  if (!devis) {
    return NextResponse.json({ erreur: "Devis introuvable" }, { status: 404 });
  }

  const { data: profil } = await supabase
    .from("artisans")
    .select("*")
    .eq("id", devis.artisan_id)
    .maybeSingle();

  const tauxTva = profil?.taux_tva ?? 20;
  const estFacture = Boolean(devis.est_facture);
  // ?avoir=1 : l'avoir qui annule cette facture (memes lignes, en negatif).
  const estAvoir = estFacture && Boolean(devis.avoir_numero) && req.nextUrl.searchParams.get("avoir") === "1";
  // ?acompte=1 : la facture d'acompte du devis (une seule ligne).
  const acompte =
    !estAvoir && devis.acompte_numero && req.nextUrl.searchParams.get("acompte") === "1" ? pdfAcompte(devis, tauxTva) : null;

  const pdfBuffer = await renderToBuffer(
    <DevisPDF
      entreprise={{
        nom: nomAffichageDocument(profil),
        mentionSociete: mentionSociete(profil),
        telephone: profil?.telephone,
        adresse: profil?.adresse,
        codePostal: profil?.code_postal,
        ville: profil?.ville,
        logoUrl: profil?.logo_url,
        siret: profil?.siret,
        numeroTva: profil?.numero_tva,
        iban: profil?.iban,
        bic: profil?.bic,
        titulaireCompte: profil?.titulaire_compte,
        moyensPaiement: profil?.moyens_paiement,
        conditionsPaiement: profil?.conditions_paiement,
        assurancePro: profil?.assurance_pro,
        mediateurConso: profil?.mediateur_conso,
        validiteJours: profil?.duree_validite_devis,
        penalitesRetard: profil?.penalites_retard,
      }}
      clientNom={devis.client_nom || ""}
      clientAdresse={devis.client_adresse}
      clientTelephone={devis.client_telephone}
      clientSiren={devis.client_siren}
      clientType={devis.client_type}
      adressePrestation={devis.adresse_prestation}
      debutPrestation={devis.debut_prestation}
      dureePrestation={devis.duree_prestation}
      lignes={acompte ? acompte.lignes : (lignes || []).map((l) => ({
        description: l.description || "",
        quantite: l.quantite || 1,
        unite: l.unite || "forfait",
        prixUnitaire: estAvoir ? -(l.prix_unitaire || 0) : l.prix_unitaire || 0,
      }))}
      tauxTva={tauxTva}
      date={acompte ? acompte.date : new Date(estAvoir ? devis.avoir_cree_le : estFacture ? devis.facture_creee_le : devis.created_at)}
      signatureUrl={devis.signature_url}
      signeLe={devis.signe_le ? new Date(devis.signe_le) : null}
      lieuSignature={devis.lieu_signature}
      type={acompte ? "acompte" : estAvoir ? "avoir" : estFacture ? "facture" : "devis"}
      numero={acompte ? acompte.numero : estAvoir ? devis.avoir_numero : estFacture ? devis.numero_facture : devis.numero_devis}
      avoirDe={estAvoir ? { numero: devis.numero_facture, date: new Date(devis.facture_creee_le) } : null}
      acompteSur={acompte?.acompteSur}
      acompteDeduit={estFacture && !estAvoir && !acompte ? acompteDeduit(devis) : null}
      paiement={
        acompte
          ? acompte.paiement
          : {
              payeeLe: devis.payee_le ? new Date(devis.payee_le) : null,
              moyenPaiement: devis.moyen_paiement || null,
            }
      }
      datePrestation={!acompte && devis.date_prestation ? new Date(devis.date_prestation) : null}
      lienPaiement={profil?.stripe_paiement_actif ? `${req.nextUrl.origin}/signer/${params.id}` : null}
    />
  );

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${acompte ? "facture-acompte" : estAvoir ? "avoir" : estFacture ? "facture" : "devis"}-${devis.client_nom || params.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
