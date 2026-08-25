"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useArtisanSession } from "@/lib/useArtisan";
import { useDevisSignesNonVus } from "@/lib/useDevisSignesNonVus";

interface TopbarProps {
  onRetour?: () => void;
  forcerRetour?: boolean;
}

export function Topbar({ onRetour, forcerRetour }: TopbarProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { artisanId } = useArtisanSession();
  const [ouvert, setOuvert] = useState(false);
  const devisSignesNonVus = useDevisSignesNonVus(artisanId);
  const afficherRetour = pathname !== "/" || forcerRetour;

  async function seDeconnecter() {
    setOuvert(false);
    await supabase.auth.signOut();
    router.push("/connexion");
  }

  return (
    <>
      <div className={`topbar${!afficherRetour ? " topbar--sans-retour" : ""}`}>
        {afficherRetour ? (
          <button className="topbar-back" onClick={onRetour ?? (() => router.back())} aria-label="Retour">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 5 8 12l7 7"
                stroke="var(--ink)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <span />
        )}

        <Link href="/" className="topbar-brand" onClick={() => setOuvert(false)}>
          <img src="/fox-icon.png" alt="" className="topbar-logo" aria-hidden="true" />
          <span className="brand-volpe">Volpe</span>
          <span className="brand-vox">Vox</span>
        </Link>

        <div className="topbar-right">
          <button
            className="hamburger"
            onClick={() => setOuvert(!ouvert)}
            aria-label="Menu"
            aria-expanded={ouvert}
          >
            ☰
          </button>

          <Link href="/parametres" className="topbar-parametres" aria-label="Paramètres" onClick={() => setOuvert(false)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="3" stroke="var(--ink)" strokeWidth="1.8" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
                stroke="var(--ink)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>

          <button className="topbar-logout" onClick={seDeconnecter} aria-label="Se déconnecter">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 4h-3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M10 12h10m0 0-3.5-3.5M20 12l-3.5 3.5"
                stroke="var(--ink)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {ouvert && (
          <div className="menu-dropdown">
            <Link href="/" onClick={() => setOuvert(false)}>
              Nouveau devis
            </Link>
            <Link href="/devis" onClick={() => setOuvert(false)} style={{ position: "relative" }}>
              Devis
              {devisSignesNonVus > 0 && <span className="badge-point" />}
            </Link>
            <Link href="/factures" onClick={() => setOuvert(false)}>
              Factures
            </Link>
            <Link href="/profil" onClick={() => setOuvert(false)}>
              Mon profil
            </Link>
            <Link href="/parametres" onClick={() => setOuvert(false)}>
              Paramètres
            </Link>
            <button onClick={seDeconnecter}>Déconnexion</button>
          </div>
        )}
      </div>
    </>
  );
}
