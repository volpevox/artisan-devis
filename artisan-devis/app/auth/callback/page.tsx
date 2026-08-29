"use client";
import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { MODE_GRATUIT } from "@/lib/modeGratuit";
import { trackEvent } from "@/lib/analytics";

// Page d'atterrissage apres "Continuer avec Google" (voir app/connexion).
// Google renvoie ici avec la session dans l'URL ; supabaseClient est configure
// avec detectSessionInUrl: true, il l'echange donc automatiquement au
// chargement. On attend cette session (via onAuthStateChange ou getSession),
// on rejoue la meme finalisation qu'une inscription par email
// (conversion GA4 + acces gratuit), puis on redirige.
export default function AuthCallback() {
  useEffect(() => {
    let traite = false;

    async function finaliser(session: Session) {
      if (traite) return;
      traite = true;

      // Nouveau compte vs simple reconnexion d'un compte existant : on ne
      // compte la conversion Google Ads (sign_up) que pour une vraie premiere
      // inscription. created_at date de la creation du compte Supabase ; il est
      // "recent" seulement lors de la toute premiere connexion Google.
      const nouveauCompte =
        Date.now() - new Date(session.user.created_at).getTime() < 5 * 60 * 1000;

      if (nouveauCompte) {
        // Sans effet hors production (voir lib/analytics.ts).
        trackEvent("sign_up", { method: "google" });
      }

      // Meme logique d'acces gratuit qu'a l'inscription par email
      // (app/connexion/page.tsx) : /api/activer-invite verifie l'email de la
      // session cote serveur. Delai de 4 s max (fonction Vercel froide) ; en
      // cas de depassement, useArtisan.ts reessaiera au prochain chargement.
      let accesGratuit = MODE_GRATUIT;
      try {
        const controleur = new AbortController();
        const minuteur = setTimeout(() => controleur.abort(), 4000);
        const reponse = await fetch("/api/activer-invite", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: controleur.signal,
        });
        clearTimeout(minuteur);
        const resultat = await reponse.json();
        accesGratuit = Boolean(resultat.ok);
      } catch {
        // ignore (delai depasse, reseau) : rattrape au prochain chargement.
      }

      // Vraie navigation (window.location) comme apres l'inscription par email.
      if (nouveauCompte) {
        window.location.href = accesGratuit ? "/profil?bienvenue=gratuit" : "/abonnement";
      } else {
        window.location.href = "/";
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finaliser(session);
    });

    // detectSessionInUrl a pu terminer l'echange avant le montage de ce
    // composant : on verifie donc aussi la session immediatement.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finaliser(session);
    });

    // Filet de securite : connexion Google refusee ou echouee -> retour a la
    // page de connexion au bout de 10 s plutot que rester bloque sur ce texte.
    const secours = setTimeout(() => {
      if (!traite) window.location.href = "/connexion";
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(secours);
    };
  }, []);

  return (
    <main className="page-shell connexion-shell">
      <p className="message" style={{ textAlign: "center", marginTop: 40 }}>
        Connexion en cours…
      </p>
    </main>
  );
}
