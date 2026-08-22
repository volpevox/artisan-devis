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
        <span className="brand-volpe">Volpe</span>
        <span className="brand-vox">Vox</span>
      </Link>

      <button
        className="hamburger"
        onClick={() => setOuvert(!ouvert)}
        aria-label="Menu"
        aria-expanded={ouvert}
      >
        ☰
      </button>

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
  );
}
