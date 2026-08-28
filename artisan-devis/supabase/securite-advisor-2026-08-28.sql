-- =====================================================================
-- Corrections Security Advisor Supabase  --  28/08/2026
-- =====================================================================
-- A executer UNE FOIS dans Supabase : Dashboard -> SQL Editor -> coller
-- tout ce fichier -> Run.
--
-- Ce script ne change AUCUN comportement de l'appli :
--   - il fige le "search_path" de 4 fonctions (mesure de securite, la
--     fonction fait exactement la meme chose qu'avant) ;
--   - il retire un droit d'execution directe sur une fonction de trigger
--     qui n'aurait jamais du etre accorde (le trigger continue de se
--     declencher tout seul, ca ne l'empeche pas).
-- Rien a redeployer sur Vercel.
--
-- Le 5e avertissement ("Leaked Password Protection Disabled") ne se corrige
-- PAS en SQL : c'est un interrupteur dans le Dashboard (voir en bas).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. "Function Search Path Mutable" (4 fonctions)
-- ---------------------------------------------------------------------
-- Sans search_path fige, quelqu'un pourrait creer un objet portant le meme
-- nom qu'une table utilisee par la fonction pour detourner son execution.
-- On force search_path = public sur les 4 fonctions signalees, quelle que
-- soit leur signature.
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure::text as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'acces_gratuit_emails_normalise',
        'auth_artisan_id',
        'numero_devis_suivant',
        'numero_facture_suivant'
      )
  loop
    execute format('alter function %s set search_path = public', f.sig);
    raise notice 'search_path fige sur %', f.sig;
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- 2. "Public / Signed-In Users Can Execute SECURITY DEFINER Function"
--    -> public.proteger_champs_abonnement()
-- ---------------------------------------------------------------------
-- C'est une fonction de TRIGGER : elle ne doit jamais etre appelee
-- directement. On retire le droit de l'executer a la main. Le trigger
-- "proteger_champs_abonnement_trigger" sur la table artisans continue de
-- se declencher normalement (un trigger s'execute avec les droits du
-- proprietaire de la table, pas de l'appelant).
revoke execute on function public.proteger_champs_abonnement() from public;
revoke execute on function public.proteger_champs_abonnement() from anon;
revoke execute on function public.proteger_champs_abonnement() from authenticated;

-- Meme logique, par proprete, pour l'autre fonction de trigger du projet
-- (non signalee par l'advisor mais elle non plus n'a pas a etre appelee
-- directement) :
revoke execute on function public.acces_gratuit_emails_normalise() from public;
revoke execute on function public.acces_gratuit_emails_normalise() from anon;
revoke execute on function public.acces_gratuit_emails_normalise() from authenticated;


-- =====================================================================
-- 3. "Leaked Password Protection Disabled"  --  A FAIRE DANS LE DASHBOARD
-- =====================================================================
-- Pas de SQL. Dans Supabase :
--   Authentication -> Sign In / Providers -> section "Password"
--   (ou Authentication -> Policies selon la version du Dashboard)
--   -> activer "Prevent use of leaked passwords".
-- Supabase compare alors le mot de passe choisi a la base HaveIBeenPwned
-- (via un hash partiel, le mot de passe en clair ne sort jamais) et refuse
-- ceux qui ont deja fuite dans une breche connue.
-- =====================================================================
