import { createClient } from "@supabase/supabase-js";

// Next.js (App Router) met en cache les appels fetch() par defaut, y compris
// ceux que supabase-js fait en interne vers l'API Supabase -- meme dans une
// route marquee "force-dynamic". Sans ce fetch personnalise, une route peut
// afficher des donnees perimees (ex: un devis lu comme "non signe" alors
// qu'il vient d'etre signe en base) tant que le cache n'expire pas.
function fetchSansCache(url: RequestInfo | URL, options?: RequestInit) {
  return fetch(url, { ...options, cache: "no-store" });
}

export function createServerSupabase(authHeader: string | null) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: {
      fetch: fetchSansCache,
      ...(authHeader ? { headers: { Authorization: authHeader } } : {}),
    },
  });
}

export function createAdminSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    global: { fetch: fetchSansCache },
  });
}

// A utiliser dans toute route qui doit agir "pour le compte de" l'artisan
// connecte : verifie le token envoye par le front (header Authorization) et
// retrouve son propre profil artisan, pour ne jamais lire/modifier les
// donnees d'un autre artisan.
export async function getArtisanConnecte(authHeader: string | null) {
  if (!authHeader) {
    return { erreur: "Non authentifie", statut: 401 } as const;
  }

  const supabase = createServerSupabase(authHeader);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erreur: "Session invalide ou expiree", statut: 401 } as const;
  }

  const { data: artisan } = await supabase
    .from("artisans")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!artisan) {
    return { erreur: "Profil artisan introuvable", statut: 404 } as const;
  }

  return { supabase, artisan, email: user.email } as const;
}
