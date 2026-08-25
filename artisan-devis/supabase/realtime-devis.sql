-- Active les mises a jour en temps reel (Supabase Realtime) sur la table
-- devis : necessaire pour que la pastille "devis signe" (menu du haut et du
-- bas) se mette a jour toute seule, sans recharger la page.
--
-- Le bloc do/exception evite une erreur si c'est deja active (executable
-- plusieurs fois sans risque).
--
-- A executer dans Supabase : Dashboard -> SQL Editor -> coller ce fichier -> Run.

do $$
begin
  alter publication supabase_realtime add table devis;
exception when duplicate_object then
  null;
end $$;
