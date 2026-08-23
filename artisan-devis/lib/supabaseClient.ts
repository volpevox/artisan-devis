import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Session persistee dans le localStorage du navigateur et rafraichie
// automatiquement en arriere-plan : l'artisan reste connecte d'une visite a
// l'autre tant qu'il ne se deconnecte pas explicitement (voir useArtisan.ts
// pour la regle qui evite les deconnexions intempestives).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
