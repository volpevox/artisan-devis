"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);

  async function seDeconnecter() {
    setOuvert(false);
    await supabase.auth.signOut();
    router.push("/connexion");
  }

  return (
    <>
      <div className="topbar">
        {pathname !== "/" ? (
          <button className="topbar-back" onClick={() => router.back()} aria-label="Retour">
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
          <img src="/fox-icon.png" alt="" className="topbar-brand-icon" />
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
            <Link href="/devis" onClick={() => setOuvert(false)}>
              Mes devis
            </Link>
            <Link href="/profil" onClick={() => setOuvert(false)}>
              Mon profil
            </Link>
            <button onClick={seDeconnecter}>Déconnexion</button>
          </div>
        )}
      </div>

      <nav className="bottom-nav">
        <Link href="/" className={`bottom-nav-item${pathname === "/" ? " active" : ""}`}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <span>Nouveau devis</span>
        </Link>
        <Link href="/devis" className={`bottom-nav-item${pathname === "/devis" ? " active" : ""}`}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM9 10h6M9 14h6M9 18h3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Mes devis</span>
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
    </>
  );
}
