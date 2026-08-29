"use client";
import { MODE_GRATUIT } from "@/lib/modeGratuit";

// Numero WhatsApp de Marley (le meme que le support ailleurs dans l'app).
const NUMERO_WHATSAPP_SUPPORT = "33766213674";

// Bandeau compact affiche en haut de l'ecran d'accueil UNIQUEMENT pendant la
// phase gratuite (NEXT_PUBLIC_MODE_GRATUIT). But de la version gratuite :
// rendre l'outil parfait -> on invite chaque artisan a signaler un bug ou une
// idee sur WhatsApp. Volontairement tres discret (une ligne) pour ne pas
// alourdir l'ecran de dictee, et non masquable.
export function BanniereRodage() {
  if (!MODE_GRATUIT) return null;

  const lien = `https://wa.me/${NUMERO_WHATSAPP_SUPPORT}?text=${encodeURIComponent(
    "Bonjour, j'ai un retour sur VolpeVox :"
  )}`;

  return (
    <a className="banniere-rodage" href={lien} target="_blank" rel="noreferrer">
      <svg className="banniere-rodage-icone" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 20.5l1.5-5.6A8.5 8.5 0 1 1 21 11.5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="banniere-rodage-texte">
        Un bug ou une idée ? <strong>Écris-moi sur WhatsApp</strong>
      </span>
      <svg className="banniere-rodage-fleche" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}
