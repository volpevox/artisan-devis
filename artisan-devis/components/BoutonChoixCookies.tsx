"use client";

import { enregistrerConsentement } from "@/lib/consentement";

// Page confidentialite : efface le choix cookies pour que le bandeau
// Accepter / Refuser reapparaisse (retrait du consentement a tout moment).
export function BoutonChoixCookies() {
  return (
    <button type="button" className="btn btn-outline" onClick={() => enregistrerConsentement(null)}>
      Modifier mon choix cookies
    </button>
  );
}
