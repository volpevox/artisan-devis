import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminSupabase } from "@/lib/supabaseServerClient";
import { DevisPDF } from "@/lib/devisPdf";
import { nomAffichageDocument, mentionSociete } from "@/lib/nomAffichage";

// Devis de demonstration (bouton « Voir un exemple de devis » de Mon compte) :
// les vraies infos de l'artisan (en-tete, mentions, pied de page) avec un
// client et des lignes fictifs, pour voir ce que recevront ses clients sans
// creer de faux devis. Meme principe d'acces que /api/devis-pdf/[id] :
// l'identifiant (UUID) de l'artisan sert de cle, et le PDF ne contient que
// des infos deja imprimees sur chacun de ses devis.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createAdminSupabase();
  const { data: profil } = await supabase.from("artisans").select("*").eq("id", params.id).maybeSingle();

  if (!profil) {
    return NextResponse.json({ erreur: "Compte introuvable" }, { status: 404 });
  }

  const pdfBuffer = await renderToBuffer(
    <DevisPDF
      entreprise={{
        nom: nomAffichageDocument(profil),
        mentionSociete: mentionSociete(profil),
        telephone: profil.telephone,
        adresse: profil.adresse,
        codePostal: profil.code_postal,
        ville: profil.ville,
        logoUrl: profil.logo_url,
        siret: profil.siret,
        numeroTva: profil.numero_tva,
        iban: profil.iban,
        bic: profil.bic,
        titulaireCompte: profil.titulaire_compte,
        moyensPaiement: profil.moyens_paiement,
        conditionsPaiement: profil.conditions_paiement,
        assurancePro: profil.assurance_pro,
        mediateurConso: profil.mediateur_conso,
        validiteJours: profil.duree_validite_devis,
        penalitesRetard: profil.penalites_retard,
      }}
      clientNom="Client exemple"
      clientAdresse={`12 rue des Lilas${profil.code_postal || profil.ville ? `, ${[profil.code_postal, profil.ville].filter(Boolean).join(" ")}` : ""}`}
      clientTelephone="06 00 00 00 00"
      lignes={[
        { description: "Exemple de prestation", quantite: 1, unite: "forfait", prixUnitaire: 450 },
        { description: "Fournitures", quantite: 1, unite: "forfait", prixUnitaire: 120 },
        { description: "Déplacement", quantite: 1, unite: "forfait", prixUnitaire: 40 },
      ]}
      tauxTva={profil.taux_tva ?? 20}
      date={new Date()}
      type="devis"
      numero={Number(profil.prochain_numero_devis) || 1}
    />
  );

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="exemple-devis.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
