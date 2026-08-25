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
        .select("id, abonnement_actif")
        .eq("user_id", sessionActuelle.user.id)
        .maybeSingle();

      let idArtisan = profil?.id;
      let abonnementActif = profil?.abonnement_actif;

      if (!idArtisan) {
        const { data: nouveauProfil } = await supabase
          .from("artisans")
          .insert({ user_id: sessionActuelle.user.id })
          .select("id, abonnement_actif")
          .single();
        idArtisan = nouveauProfil?.id;
        abonnementActif = nouveauProfil?.abonnement_actif;
      }

      // La carte bancaire est desormais obligatoire des l'inscription : sans
      // abonnement Stripe (trialing ou actif), l'acces est bloque des le
      // depart, plus de fenetre de grace locale basee sur essai_expire_le.
      const bloque = !abonnementActif;

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
    } = supabase.auth.onAuthStateChange((event) => {
      // Une deconnexion (bouton "Se deconnecter" ou session revoquee) doit
      // renvoyer vers /connexion immediatement. Tenter de "rattraper" cet
      // evenement par un rafraichissement (comme on le faisait avant)
      // retardait -- voire bloquait -- une deconnexion volontaire de
      // l'artisan : le cas d'un SIGNED_OUT transitoire lors d'un retour au
      // premier plan est deja couvert par surRetourAuPremierPlan ci-dessous.
      if (event === "SIGNED_OUT" && actif) {
        router.push("/connexion");
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
