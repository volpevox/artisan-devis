"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function Topbar() {
  const router = useRouter();

  async function seDeconnecter() {
    await supabase.auth.signOut();
    router.push("/connexion");
  }

  return (
    <div className="topbar">
      <Link href="/" className="topbar-brand">
        Artisan Devis
      </Link>
      <div className="topbar-links">
        <Link href="/">Nouveau devis</Link>
        <Link href="/devis">Mes devis</Link>
        <Link href="/profil">Mon profil</Link>
        <button
          onClick={seDeconnecter}
          style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "var(--ink)", fontWeight: 600, cursor: "pointer" }}
        >
          Déconnexion
        </button>
      </div>
    </div>
  );
}
