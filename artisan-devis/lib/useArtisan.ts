"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

// L'artisan garde acces a son profil (pour gerer/reactiver son abonnement) et
// a la page d'abonnement elle-meme meme si l'acces au reste est bloque.
const PAGES_TOUJOURS_ACCESSIBLES = ["/profil", "/abonnement"];

export function useArtisanSession() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [artisanId, setArtisanId] = useState<string | null>(null);
  const [accesBloque, setAccesBloque] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let actif = true;

    async function initialiser() {
      const {
        data: { session: sessionActuelle },
      } = await supabase.auth.getSession();

      if (!sessionActuelle) {
        if (actif) {
          setLoading(false);
          router.push("/connexion");
        }
        return;
      }

      if (actif) setSession(sessionActuelle);

      const { data: profil } = await supabase
        .from("artisans")
        .select("id, essai_expire_le, abonnement_actif")
        .eq("user_id", sessionActuelle.user.id)
        .maybeSingle();

      let idArtisan = profil?.id;
      let essaiExpireLe = profil?.essai_expire_le;
      let abonnementActif = profil?.abonnement_actif;

      if (!idArtisan) {
        const { data: nouveauProfil } = await supabase
          .from("artisans")
          .insert({ user_id: sessionActuelle.user.id })
          .select("id, essai_expire_le, abonnement_actif")
          .single();
        idArtisan = nouveauProfil?.id;
        essaiExpireLe = nouveauProfil?.essai_expire_le;
        abonnementActif = nouveauProfil?.abonnement_actif;
      }

      const essaiTermine = essaiExpireLe ? new Date(essaiExpireLe) < new Date() : false;
      const bloque = essaiTermine && !abonnementActif;

      if (bloque && !PAGES_TOUJOURS_ACCESSIBLES.includes(pathname)) {
        router.push("/abonnement");
      }

      if (actif) {
        setArtisanId(idArtisan || null);
        setAccesBloque(bloque);
        setLoading(false);
      }
    }

    initialiser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nouvelleSession) => {
      // Supabase declenche aussi cet evenement avec une session nulle lors du
      // chargement initial ou d'un rafraichissement transitoire (ex: reseau
      // instable sur un chantier, ou telephone reste en veille trop longtemps
      // pour que le rafraichissement automatique ait eu le temps de passer) :
      // avant de renvoyer vers /connexion, on retente une fois un rafraichissement
      // explicite, pour ne pas ejecter un artisan encore reellement connecte.
      if (event === "SIGNED_OUT") {
        const { data } = await supabase.auth.refreshSession();
        if (!actif) return;
        if (!data.session) {
          router.push("/connexion");
        }
      }
    });

    // Le telephone met en pause les timers JS quand l'appli est en arriere-plan
    // (verrouillage d'ecran, changement d'appli sur un chantier) : au retour,
    // on force une verification/rafraichissement immediat plutot que d'attendre
    // le prochain cycle automatique, qui peut arriver trop tard.
    function surRetourAuPremierPlan() {
      if (document.visibilityState === "visible") {
        supabase.auth.getSession();
      }
    }
    document.addEventListener("visibilitychange", surRetourAuPremierPlan);

    return () => {
      actif = false;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", surRetourAuPremierPlan);
    };
  }, [router, pathname]);

  return { session, artisanId, loading, accesBloque };
}
