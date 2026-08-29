"use client";
import { MODE_GRATUIT } from "@/lib/modeGratuit";

// Numero WhatsApp de Marley (le meme que le support ailleurs dans l'app).
const NUMERO_WHATSAPP_SUPPORT = "33766213674";

// Bandeau affiche en haut de l'ecran d'accueil UNIQUEMENT pendant la phase
// gratuite (NEXT_PUBLIC_MODE_GRATUIT). Le but de la version gratuite est de
// rendre l'outil parfait : on invite chaque artisan a signaler un bug, un
// point de friction ou une idee directement sur WhatsApp. Non masquable
// volontairement : c'est le coeur de la demarche pendant le rodage.
export function BanniereRodage() {
  if (!MODE_GRATUIT) return null;

  const lien = `https://wa.me/${NUMERO_WHATSAPP_SUPPORT}?text=${encodeURIComponent(
    "Bonjour, j'ai un retour sur VolpeVox :"
  )}`;

  return (
    <a className="banniere-rodage" href={lien} target="_blank" rel="noreferrer">
      <span className="banniere-rodage-icone" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 20.5l1.5-5.6A8.5 8.5 0 1 1 21 11.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="banniere-rodage-texte">
        <strong>Aide-moi à rendre VolpeVox parfait.</strong> Un bug, un détail qui coince, une idée d&apos;amélioration ?
        Écris-moi sur WhatsApp, je corrige vite.
      </span>
    </a>
  );
}
