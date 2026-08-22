"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export function useArtisanSession() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [artisanId, setArtisanId] = useState<string | null>(null);
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
        .select("id")
        .eq("user_id", sessionActuelle.user.id)
        .maybeSingle();

      let idArtisan = profil?.id;

      if (!idArtisan) {
        const { data: nouveauProfil } = await supabase
          .from("artisans")
          .insert({ user_id: sessionActuelle.user.id })
          .select("id")
          .single();
        idArtisan = nouveauProfil?.id;
      }

      if (actif) {
        setArtisanId(idArtisan || null);
        setLoading(false);
      }
    }

    initialiser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nouvelleSession) => {
      if (!nouvelleSession) {
        router.push("/connexion");
      }
    });

    return () => {
      actif = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return { session, artisanId, loading };
}
