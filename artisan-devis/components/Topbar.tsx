"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function Topbar() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);

  async function seDeconnecter() {
    setOuvert(false);
    await supabase.auth.signOut();
    router.push("/connexion");
  }

  return (
    <div className="topbar">
      <Link href="/" className="topbar-brand" onClick={() => setOuvert(false)}>
        Artisan Devis
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
