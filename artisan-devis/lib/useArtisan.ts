"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

// L'artisan garde acces a son profil (pour gerer/reactiver son abonnement,
// ou completer les informations obligatoires) et a la page d'abonnement
// elle-meme meme si l'acces au reste est bloque.
const PAGES_TOUJOURS_ACCESSIBLES = ["/profil", "/abonnement", "/parametres/comment-ca-marche"];

// Une seule verification d'acces gratuit par chargement de page : le hook est
// monte par plusieurs composants a la fois (Topbar + la page), et une vraie
// navigation (window.location) reinitialise ce module de toute facon.
let verificationAccesGratuitFaite = false;

// Les memes champs que la validation de app/profil/page.tsx : tant qu'ils ne
// sont pas tous remplis, l'artisan ne doit pas pouvoir utiliser l'outil (les
// devis/factures generes seraient incomplets). taux_tva peut valoir 0
// (franchise en base) -- on verifie donc juste qu'il est renseigne, pas
// qu'il est "truthy".
export function profilComplet(profil: any) {
  return Boolean(
    profil?.nom_complet?.trim() &&
      profil?.telephone?.trim() &&
      profil?.adresse?.trim() &&
      profil?.code_postal?.trim() &&
      profil?.ville?.trim() &&
      profil?.siret?.trim() &&
      profil?.taux_tva !== null &&
      profil?.taux_tva !== undefined
  );
}

export function useArtisanSession() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [artisanId, setArtisanId] = useState<string | null>(null);
  const [profilArtisan, setProfilArtisan] = useState<any>(null);
  const [accesBloque, setAccesBloque] = useState(false);
  const [loading, setLoading] = useState(true);

  // Session et profil ne sont charges qu'une fois au montage (pas a chaque
  // changement de page) : sur un reseau mobile, refaire cet aller-retour
  // Supabase a chaque navigation ajoutait un temps de chargement visible sur
  // toutes les pages. La verification de redirection (effet suivant) reste
  // par contre re-executee a chaque changement de page, mais sans appel
  // reseau.
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
      const sessionValide = sessionActuelle;

      // Lecture du profil. On selectionne aussi nom_entreprise et
      // stripe_paiement_actif : l'ecran d'accueil s'en sert (salutation +
      // disponibilite du paiement en ligne) et evite ainsi de refaire sa
      // propre requete a la table artisans.
      const lireProfil = () =>
        supabase
          .from("artisans")
          .select(
            "id, abonnement_actif, nom_complet, nom_entreprise, telephone, adresse, code_postal, ville, siret, taux_tva, stripe_paiement_actif"
          )
          .eq("user_id", sessionValide.user.id)
          .maybeSingle()
          .then(({ data }) => data);

      // Synchronise l'acces gratuit (accorde si l'email est dans la liste
      // acces_gratuit_emails, revoque s'il n'y est plus). Une seule fois par
      // chargement d'appli (le hook est monte par plusieurs composants).
      const synchroniserAccesGratuit = async () => {
        if (verificationAccesGratuitFaite) return;
        verificationAccesGratuitFaite = true;
        try {
          await fetch("/api/activer-invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${sessionValide.access_token}` },
          });
        } catch {
          // ignore : la lecture du profil reste la source de verite
        }
      };

      let profil = await lireProfil();

      if (profil?.abonnement_actif) {
        // Cas normal (artisan abonne) : on affiche tout de suite et on lance
        // la synchro acces gratuit en arriere-plan. Elle ne peut ici que
        // revoquer un acces gratuit retire de la liste -- ce qui prendra
        // effet a l'ouverture suivante, sans retarder l'affichage a chaque
        // ouverture (c'etait le principal cout au demarrage : on attendait le
        // reveil de la fonction Vercel avant meme de lire le profil).
        synchroniserAccesGratuit();
      } else {
        // Pas (ou plus) d'abonnement actif : la synchro peut debloquer
        // l'artisan (email present dans la liste). On l'attend puis on relit
        // le profil avant de decider de bloquer l'acces.
        await synchroniserAccesGratuit();
        if (!actif) return;
        profil = await lireProfil();
      }

      // Aucune ligne "artisans" n'est creee ici : elle n'existe qu'une fois
      // l'abonnement Stripe reellement demarre (voir le webhook Stripe), pour
      // ne pas polluer la base avec des comptes crees puis jamais abonnes.
      // Tant qu'elle n'existe pas, idArtisan reste vide et bloque reste vrai
      // -- l'artisan est simplement renvoye vers /abonnement, comme s'il
      // n'etait pas abonne (ce qui est le cas).
      if (actif) {
        setArtisanId(profil?.id || null);
        setProfilArtisan(profil || null);
        // La carte bancaire est desormais obligatoire des l'inscription :
        // sans abonnement Stripe (trialing ou actif), l'acces est bloque des
        // le depart, plus de fenetre de grace locale basee sur essai_expire_le.
        setAccesBloque(!profil?.abonnement_actif);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Verification de redirection a chaque changement de page, a partir des
  // donnees deja chargees ci-dessus -- aucun nouvel appel reseau ici.
  useEffect(() => {
    if (loading) return;

    if (accesBloque && !PAGES_TOUJOURS_ACCESSIBLES.includes(pathname)) {
      router.push("/abonnement");
    } else if (!accesBloque && !profilComplet(profilArtisan) && !PAGES_TOUJOURS_ACCESSIBLES.includes(pathname)) {
      // Juste apres l'inscription (et l'abonnement en place), l'artisan doit
      // completer son profil avant d'utiliser l'outil -- une fois fait, il
      // n'y repasse plus jamais et retrouve directement la page dictee aux
      // connexions suivantes.
      router.push("/profil");
    }
  }, [pathname, loading, accesBloque, profilArtisan, router]);

  return { session, artisanId, profilArtisan, loading, accesBloque };
}
