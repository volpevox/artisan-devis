"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useArtisanSession } from "@/lib/useArtisan";

interface TopbarProps {
  onRetour?: () => void;
  forcerRetour?: boolean;
}

export function Topbar({ onRetour, forcerRetour }: TopbarProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { artisanId } = useArtisanSession();
  const [ouvert, setOuvert] = useState(false);
  const [devisSignesNonVus, setDevisSignesNonVus] = useState(0);
  const afficherRetour = pathname !== "/" || forcerRetour;

  useEffect(() => {
    if (!artisanId) return;

    async function compter() {
      const { count } = await supabase
        .from("devis")
        .select("id", { count: "exact", head: true })
        .eq("artisan_id", artisanId)
        .eq("est_facture", false)
        .eq("statut", "signe")
        .is("signature_vue_le", null);
      setDevisSignesNonVus(count || 0);
    }
    compter();
  }, [artisanId, pathname]);

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
            <Link href="/abonnement" onClick={() => setOuvert(false)}>
              Mon abonnement
            </Link>
            <button onClick={seDeconnecter}>Déconnexion</button>
          </div>
        )}
      </div>
    </>
  );
}
