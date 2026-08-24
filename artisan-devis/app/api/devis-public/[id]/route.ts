import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabaseServerClient";

// Sert le devis au client final (statut, signature...) : jamais de cache,
// sinon un client pourrait voir un statut perime apres avoir signe.
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
    .select("nom_entreprise, taux_tva, stripe_paiement_actif")
    .eq("id", devis.artisan_id)
    .maybeSingle();

  return NextResponse.json({ devis, lignes, profil }, { headers: { "Cache-Control": "no-store" } });
}
