"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useDevisSignesNonVus } from "@/lib/useDevisSignesNonVus";

// Pages ou le menu du bas doit apparaitre -- volontairement une liste
// explicite plutot qu'une exclusion, pour ne jamais l'afficher par erreur
// sur une page publique (ex: /signer/[id], accessible sans compte).
const PAGES_AVEC_MENU = ["/", "/devis", "/factures", "/profil", "/abonnement", "/abonnement/succes"];

export function BottomNav() {
  const pathname = usePathname();
  const [artisanId, setArtisanId] = useState<string | null>(null);
  const devisSignesNonVus = useDevisSignesNonVus(artisanId);
  const afficher = PAGES_AVEC_MENU.includes(pathname);

  // Lecture directe de la session, sans la logique de redirection de
  // useArtisanSession : ce composant est rendu sur toutes les pages (y
  // compris publiques) depuis le layout global, il ne doit jamais renvoyer
  // un client non connecte vers /connexion.
  useEffect(() => {
    if (!afficher) return;
    let actif = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!actif || !session) return;
      supabase
        .from("artisans")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (actif && data?.id) setArtisanId(data.id);
        });
    });

    return () => {
      actif = false;
    };
  }, [afficher]);

  if (!afficher) return null;

  return (
    <nav className="bottom-nav">
      <Link href="/" className={`bottom-nav-item${pathname === "/" ? " active" : ""}`}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span>Nouveau devis</span>
      </Link>
      <Link href="/devis" className={`bottom-nav-item${pathname === "/devis" ? " active" : ""}`} style={{ position: "relative" }}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM9 10h6M9 14h6M9 18h3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>Devis</span>
        {devisSignesNonVus > 0 && <span className="badge-point badge-point--nav" />}
      </Link>
      <Link href="/factures" className={`bottom-nav-item${pathname === "/factures" ? " active" : ""}`}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M7 3h10a1 1 0 0 1 1 1v17l-3-2-2 2-2-2-2 2-3-2V4a1 1 0 0 1 1-1Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M9 8h6M9 12h6M9 16h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span>Factures</span>
      </Link>
      <Link href="/profil" className={`bottom-nav-item${pathname === "/profil" ? " active" : ""}`}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c0-3.3 3.1-6 7-6s7 2.7 7 6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>Mon profil</span>
      </Link>
    </nav>
  );
}
