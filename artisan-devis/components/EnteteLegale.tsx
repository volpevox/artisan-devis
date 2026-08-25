"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

// En-tete dediee aux pages legales (mentions, CGU, CGV, confidentialite) :
// contrairement a Topbar, elle ne verifie aucune session, car ces pages
// doivent rester accessibles sans compte (ex: depuis l'inscription).
export function EnteteLegale() {
  const router = useRouter();

  return (
    <div className="topbar">
      <button className="topbar-back" onClick={() => router.back()} aria-label="Retour">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 5 8 12l7 7" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <Link href="/" className="topbar-brand">
        <img src="/fox-icon.png" alt="" className="topbar-logo" aria-hidden="true" />
        <span className="brand-volpe">Volpe</span>
        <span className="brand-vox">Vox</span>
      </Link>

      <span />
    </div>
  );
}
